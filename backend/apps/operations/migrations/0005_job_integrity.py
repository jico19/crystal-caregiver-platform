"""Extend existing integrity conventions to job submission evidence."""

from importlib import import_module
from django.db import migrations


def configure(apps, editor, reverse=False):
    guards = import_module("apps.operations.migrations.0002_integrity_guards")
    for label in ("JobPosting", "JobSubmission"):
        model = apps.get_model("operations", label)
        checks = []
        for field in guards.scoped_links(model):
            parent = field.related_model._meta.db_table
            checks.append(
                f"NOT EXISTS (SELECT 1 FROM {parent} p WHERE p.id = NEW.{field.column} AND p.branch_id = NEW.branch_id)"
            )
        if label == "JobSubmission":
            checks.append(
                "NOT EXISTS (SELECT 1 FROM operations_caregiverapplication a WHERE a.id = NEW.application_id AND a.caregiver_id = NEW.caregiver_id)"
            )
        for event in ("INSERT", "UPDATE"):
            guards.trigger(
                editor,
                model._meta.db_table,
                f"{label.lower()}_{event.lower()}_scope",
                event,
                " OR ".join(f"({c})" for c in checks),
                reverse,
            )
        frozen = ["branch_id"]
        if label == "JobSubmission":
            frozen += ["job_id", "caregiver_id", "application_id"]
        guards.trigger(
            editor,
            model._meta.db_table,
            f"{label.lower()}_immutable",
            "UPDATE",
            " OR ".join(f"NEW.{c} IS DISTINCT FROM OLD.{c}" for c in frozen),
            reverse,
        )


def forward(apps, editor):
    configure(apps, editor)


def backward(apps, editor):
    configure(apps, editor, True)


class Migration(migrations.Migration):
    dependencies = [
        ("operations", "0004_jobposting_jobsubmission_jobposting_jobposting_bd_and_more")
    ]
    operations = [migrations.RunPython(forward, backward)]
