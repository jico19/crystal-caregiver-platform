"""Database-level branch boundaries and immutable evidence.

Use historical migration models only. PostgreSQL uses composite foreign keys;
SQLite uses equivalent relationship triggers for local development.
"""
from django.db import migrations


APPEND_ONLY = {
    "applicationreview", "intakereview", "documentreview", "authorizationevent",
    "signatureevent", "deliveryattempt", "auditevent", "trainingcertificate",
    "formversion", "trainingcourseversion", "careplan",
}
FROZEN_FIELDS = {
    "document": ("document_type_id",),
    "documentversion": ("document_id", "version_number", "file_id", "issued_on", "expires_on", "submitted_at"),
    "storedfile": ("private_storage_key", "sha256", "byte_size", "content_type", "original_name"),
    "signaturerequest": ("form_version_id", "caregiver_id", "client_id", "application_id", "intake_id", "rendered_file_id", "requested_signer_id"),
    "caregiverapplication": ("caregiver_id", "form_version_id", "submitted_answers", "submitted_at"),
    "clientintake": ("client_id", "referral_id", "form_version_id", "submitted_answers", "submitted_at"),
    "statebranch": ("agency_id", "state_code"),
    "clientreferral": ("source_id", "source_name_snapshot", "received_at"),
}

# SQL uses fixed migration-owned identifiers, never user input. These checks
# enforce matching subjects as well as matching branches.
SUBJECT_CHECKS = {
    "signaturerequest": [
        "NEW.application_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM operations_caregiverapplication p WHERE p.id = NEW.application_id AND p.caregiver_id = NEW.caregiver_id AND p.form_version_id = NEW.form_version_id)",
        "NEW.intake_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM operations_clientintake p WHERE p.id = NEW.intake_id AND p.client_id = NEW.client_id AND p.form_version_id = NEW.form_version_id)",
    ],
    "signatureevent": [
        "NOT EXISTS (SELECT 1 FROM operations_signaturerequest p WHERE p.id = NEW.request_id AND p.requested_signer_id = NEW.signer_id)",
    ],
    "clientintake": [
        "NEW.referral_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM operations_clientreferral p WHERE p.id = NEW.referral_id AND p.client_id = NEW.client_id)",
    ],
    "clientauthorization": [
        "NEW.supersedes_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM operations_clientauthorization p WHERE p.id = NEW.supersedes_id AND p.client_id = NEW.client_id)",
    ],
    "authorizationdocument": [
        "NOT EXISTS (SELECT 1 FROM operations_clientauthorization a JOIN operations_documentversion v ON v.id = NEW.document_version_id JOIN operations_document d ON d.id = v.document_id WHERE a.id = NEW.authorization_id AND a.client_id = d.client_id)",
    ],
    "careplan": [
        "NEW.document_version_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM operations_documentversion v JOIN operations_document d ON d.id = v.document_id WHERE v.id = NEW.document_version_id AND d.client_id = NEW.client_id)",
    ],
    "trainingcertificate": [
        "NOT EXISTS (SELECT 1 FROM operations_trainingassignment a WHERE a.id = NEW.assignment_id AND a.completed_at IS NOT NULL AND a.progress_percent = 100)",
    ],
}


def scoped_links(model):
    columns = {f.name for f in model._meta.fields}
    if "branch" not in columns:
        return []
    return [f for f in model._meta.fields if f.is_relation and f.name != "branch"
            and "branch" in {p.name for p in f.related_model._meta.fields}]


def trigger(editor, table, name, event, condition, reverse=False):
    q = editor.quote_name
    if reverse:
        if editor.connection.vendor == "postgresql":
            editor.execute(f"DROP TRIGGER IF EXISTS {q(name)} ON {q(table)}")
            editor.execute(f"DROP FUNCTION IF EXISTS {q(name)}()")
        else:
            editor.execute(f"DROP TRIGGER IF EXISTS {q(name)}")
        return
    if editor.connection.vendor == "postgresql":
        editor.execute(f"""CREATE FUNCTION {q(name)}() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN IF ({condition}) THEN
                RAISE EXCEPTION 'Agency record integrity violation' USING ERRCODE = '23514';
            END IF; RETURN NEW; END; $$""")
        editor.execute(f"CREATE TRIGGER {q(name)} BEFORE {event} ON {q(table)} FOR EACH ROW EXECUTE FUNCTION {q(name)}()")
    else:
        editor.execute(f"""CREATE TRIGGER {q(name)} BEFORE {event} ON {q(table)}
            FOR EACH ROW WHEN ({condition}) BEGIN
            SELECT RAISE(ABORT, 'Agency record integrity violation'); END""")


def configure(apps, editor, reverse=False):
    if editor.connection.vendor not in {"sqlite", "postgresql"}:
        raise RuntimeError("Agency integrity guards require SQLite or PostgreSQL.")
    q = editor.quote_name
    for model in apps.get_app_config("operations").get_models():
        table = model._meta.db_table
        label = model._meta.model_name
        fields = {f.column for f in model._meta.fields}
        checks = list(SUBJECT_CHECKS.get(label, []))
        for field in scoped_links(model):
            parent = field.related_model._meta.db_table
            name = f"{label}_{field.name}_scope"
            if editor.connection.vendor == "postgresql":
                if reverse:
                    editor.execute(f"ALTER TABLE {q(table)} DROP CONSTRAINT IF EXISTS {q(name)}")
                else:
                    editor.execute(f"ALTER TABLE {q(table)} ADD CONSTRAINT {q(name)} FOREIGN KEY (branch_id, {q(field.column)}) REFERENCES {q(parent)} (branch_id, id)")
            checks.append(f"NEW.{field.column} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM {q(parent)} p WHERE p.id = NEW.{field.column} AND p.branch_id = NEW.branch_id)")
        if checks:
            condition = " OR ".join(f"({c})" for c in checks)
            for event in ("INSERT", "UPDATE"):
                trigger(editor, table, f"{label}_{event.lower()}_scope", event, condition, reverse)
        frozen = list(FROZEN_FIELDS.get(label, ()))
        if "branch_id" in fields:
            frozen.append("branch_id")
        # Owning subjects cannot be reassigned after related evidence exists.
        frozen.extend(c for c in ("client_id", "caregiver_id") if c in fields)
        if label in APPEND_ONLY:
            frozen = list(fields)
        if frozen:
            condition = " OR ".join(f"NEW.{q(c)} IS DISTINCT FROM OLD.{q(c)}" for c in sorted(set(frozen)))
            if label in {"caregiverapplication", "clientintake"}:
                condition = f"NEW.branch_id IS DISTINCT FROM OLD.branch_id OR (OLD.submitted_at IS NOT NULL AND ({condition}))"
            trigger(editor, table, f"{label}_immutable", "UPDATE", condition, reverse)
        if label in APPEND_ONLY or label in FROZEN_FIELDS:
            trigger(editor, table, f"{label}_no_delete", "DELETE", "1 = 1", reverse)


def forward(apps, schema_editor):
    configure(apps, schema_editor)


def backward(apps, schema_editor):
    configure(apps, schema_editor, reverse=True)


class Migration(migrations.Migration):
    dependencies = [("operations", "0001_initial")]
    operations = [migrations.RunPython(forward, backward)]
