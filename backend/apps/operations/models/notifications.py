from django.db import models
from django.db.models import Q

from .base import Record, ScopedRecord, actor, relation, unique


# Store branch notices with an audience and optional publication/expiry times.
class Announcement(ScopedRecord):
    audience = models.CharField(max_length=16)
    title = models.CharField(max_length=200)
    body = models.TextField()
    published_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    author = actor()


# Configure disabled-by-default reminder timing/channels per branch and event.
class ReminderRule(ScopedRecord):
    event_type = models.CharField(max_length=64)
    channel = models.CharField(max_length=16)
    lead_days = models.PositiveIntegerField(null=True, blank=True)
    enabled = models.BooleanField(default=False)

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [
            unique("branch", "event_type", "channel", name="reminder_rule_unique")
        ]


# Store generic recipient-linked content with an idempotent deduplication key.
class Notification(ScopedRecord):
    recipient_user = actor(null=True, blank=True)
    caregiver = relation("operations.Caregiver", null=True, blank=True)
    client = relation("operations.Client", null=True, blank=True)
    event_type = models.CharField(max_length=64)
    subject_reference = models.UUIDField()
    deduplication_key = models.CharField(max_length=255, unique=True)
    safe_content = models.TextField()
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [
            models.CheckConstraint(
                condition=Q(recipient_user__isnull=False)
                | Q(caregiver__isnull=False)
                | Q(client__isnull=False),
                name="notification_recipient",
            ),
            models.CheckConstraint(
                condition=Q(caregiver__isnull=True) | Q(client__isnull=True),
                name="notification_single_person",
            ),
        ]


# Track simulated per-channel delivery scheduling without external provider calls.
class NotificationDelivery(ScopedRecord):
    notification = relation(Notification)
    channel = models.CharField(max_length=16, choices=[("email", "Email"), ("sms", "SMS")])
    recipient_snapshot = models.CharField(max_length=255)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=24, default="pending")
    simulated = models.BooleanField(default=True)
    provider_reference = models.CharField(max_length=255, blank=True)

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [
            unique("notification", "channel", name="notification_delivery_unique"),
            models.CheckConstraint(
                condition=Q(channel__in=["email", "sms"]), name="delivery_channel"
            ),
        ]
        indexes = ScopedRecord.Meta.indexes + [
            models.Index(fields=["status", "scheduled_at"], name="delivery_pending_schedule")
        ]


# Record numbered delivery outcomes using safe error codes instead of sensitive payloads.
class DeliveryAttempt(ScopedRecord):
    delivery = relation(NotificationDelivery)
    attempt_number = models.PositiveIntegerField()
    attempted_at = models.DateTimeField()
    outcome = models.CharField(max_length=32)
    safe_error_code = models.CharField(max_length=100, blank=True)

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [
            unique("delivery", "attempt_number", name="delivery_attempt_unique"),
            models.CheckConstraint(
                condition=Q(attempt_number__gt=0), name="attempt_number_positive"
            ),
        ]


# Preserve actor, action, public resource identity and safe metadata for audit history.
class AuditEvent(Record):
    branch = relation("operations.StateBranch", null=True, blank=True)
    actor = actor(null=True, blank=True)
    action = models.CharField(max_length=100)
    resource_type = models.CharField(max_length=100)
    resource_id = models.UUIDField()
    occurred_at = models.DateTimeField()
    safe_metadata = models.JSONField(default=dict)

    class Meta:
        indexes = [models.Index(fields=["branch", "occurred_at"], name="audit_branch_date")]
