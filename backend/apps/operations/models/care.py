from django.db import models
from django.db.models import Q, F

from .base import ScopedRecord, actor, relation, unique, date_range


class ClientAuthorization(ScopedRecord):
    client = relation("operations.Client")
    reference = models.CharField(max_length=128, blank=True)
    issuer_name = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=32, default="submitted")
    valid_from = models.DateField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True, db_index=True)
    supersedes = relation("self", null=True, blank=True)

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [date_range("valid_from", "valid_until", "authorization_dates"), models.CheckConstraint(condition=~Q(id=F("supersedes")), name="authorization_not_self")]


class AuthorizationDocument(ScopedRecord):
    authorization = relation(ClientAuthorization)
    document_version = relation("operations.DocumentVersion")

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [unique("authorization", "document_version", name="authorization_document_unique")]


class AuthorizationEvent(ScopedRecord):
    authorization = relation(ClientAuthorization)
    actor = actor()
    previous_status = models.CharField(max_length=32)
    new_status = models.CharField(max_length=32)
    comment = models.TextField(blank=True)
    occurred_at = models.DateTimeField()


class CarePlan(ScopedRecord):
    client = relation("operations.Client")
    version_number = models.PositiveIntegerField()
    summary = models.TextField(blank=True)
    document_version = relation("operations.DocumentVersion", null=True, blank=True)
    effective_from = models.DateField(null=True, blank=True)
    effective_until = models.DateField(null=True, blank=True)
    recorded_by = actor()

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [unique("client", "version_number", name="care_plan_version_unique"), date_range("effective_from", "effective_until", "care_plan_dates"), models.CheckConstraint(condition=Q(version_number__gt=0), name="care_plan_version_positive")]


class ServiceScheduleEntry(ScopedRecord):
    client = relation("operations.Client")
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    timezone = models.CharField(max_length=64)
    service_label = models.CharField(max_length=200)
    status = models.CharField(max_length=32, default="scheduled")
    recorded_by = actor()

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [models.CheckConstraint(condition=Q(ends_at__gt=F("starts_at")), name="schedule_positive_duration")]
