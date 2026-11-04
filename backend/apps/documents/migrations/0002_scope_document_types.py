"""Add upload categories explicitly named in the Scope of Work.

Existing catalog entries and agency requirements are preserved. No new category
is made mandatory and no new expiration policy is inferred.
"""
from django.db import migrations


def add_scope_categories(apps, schema_editor):
    document_type = apps.get_model("documents", "DocumentType")
    entries = {
        "caregiver": (
            "CNA/HHA Certificate", "Physical Exam", "Social Security Card",
            "Auto Insurance", "Driver's Insurance", "Direct Deposit Form",
            "Other onboarding documents",
        ),
        "client": (
            "Insurance Cards", "Physician Orders", "Plan of Care", "Identification",
            "Authorizations", "Other required documents",
        ),
    }
    for role, names in entries.items():
        for name in names:
            document_type.objects.using(schema_editor.connection.alias).get_or_create(
                name=name, defaults={"for_role": role, "requires_expiration": False},
            )


class Migration(migrations.Migration):
    dependencies = [("documents", "0001_initial")]
    operations = [migrations.RunPython(add_scope_categories, migrations.RunPython.noop)]
