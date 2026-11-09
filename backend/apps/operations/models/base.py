"""Shared record conventions. Business workflows belong in domain services."""

import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q, F


def relation(target, **kwargs):
    return models.ForeignKey(target, on_delete=models.PROTECT, **kwargs)


def actor(**kwargs):
    return relation(settings.AUTH_USER_MODEL, **kwargs)


def unique(*fields, name):
    return models.UniqueConstraint(fields=fields, name=name)


def date_range(start, end, name):
    return models.CheckConstraint(
        condition=Q(**{f"{start}__isnull": True})
        | Q(**{f"{end}__isnull": True})
        | Q(**{f"{end}__gte": F(start)}),
        name=name,
    )


def one_subject(name):
    return models.CheckConstraint(
        condition=(
            Q(caregiver__isnull=False, client__isnull=True)
            | Q(caregiver__isnull=True, client__isnull=False)
        ),
        name=name,
    )


class Record(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class ScopedRecord(Record):
    branch = relation("operations.StateBranch")

    class Meta:
        abstract = True
        constraints = [unique("branch", "id", name="%(class)s_branch_id")]
        indexes = [models.Index(fields=["branch", "created_at"], name="%(class)s_bd")]
