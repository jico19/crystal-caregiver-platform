"""Scope-listed categories only; no mandatory state policy is inferred."""

from django.db import migrations


CATEGORIES = {
    "caregiver": [
        ("drivers_license", "Driver's License"),
        ("cpr", "CPR Certificate"),
        ("cna_hha", "CNA/HHA Certificate"),
        ("tb_test", "TB Test"),
        ("physical_exam", "Physical Exam"),
        ("background_check", "Background Check"),
        ("social_security_card", "Social Security Card"),
        ("auto_insurance", "Auto Insurance"),
        ("drivers_insurance", "Driver's Insurance"),
        ("direct_deposit", "Direct Deposit Form"),
        ("caregiver_other", "Other Onboarding Documents"),
    ],
    "client": [
        ("insurance_cards", "Insurance Cards"),
        ("medicaid", "Medicaid Documents"),
        ("physician_orders", "Physician Orders"),
        ("plan_of_care", "Plan of Care"),
        ("identification", "Identification"),
        ("authorizations", "Authorizations"),
        ("client_other", "Other Required Documents"),
    ],
}


def populate(apps, schema_editor):
    catalog = apps.get_model("operations", "DocumentType")
    for audience, entries in CATEGORIES.items():
        for code, label in entries:
            catalog.objects.using(schema_editor.connection.alias).get_or_create(
                code=code,
                defaults={"label": label, "audience": audience},
            )


class Migration(migrations.Migration):
    dependencies = [("operations", "0002_integrity_guards")]
    # Catalog rows may later be referenced: rollback deliberately preserves them.
    operations = [migrations.RunPython(populate, migrations.RunPython.noop)]
