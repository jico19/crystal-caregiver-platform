import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.core.models import State, SoftDeleteModel

class AuditLogQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValueError("Audit records cannot be changed.")

    def delete(self):
        raise ValueError("Audit records cannot be deleted.")

    def bulk_update(self, objs, fields, batch_size=None):
        raise ValueError("Audit records cannot be changed.")

    def bulk_create(self, objs, **kwargs):
        if kwargs.get("update_conflicts"):
            raise ValueError("Audit records cannot be changed.")
        return super().bulk_create(objs, **kwargs)


class AuditLog(models.Model):
    """Append-only table recording access, changes, and compliance events."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=100)
    table_name = models.CharField(max_length=100)
    record_id = models.TextField()
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    ip_address = models.CharField(max_length=45, null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    request_id = models.UUIDField(null=True, blank=True)
    entity_state = models.ForeignKey(
        State,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    created_at = models.DateTimeField(default=timezone.now)
    objects = AuditLogQuerySet.as_manager()

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValueError("Audit records cannot be changed.")
        kwargs["force_insert"] = True
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Audit records cannot be deleted.")

    class Meta:
        db_table = "audit_logs"
        indexes = [
            models.Index(fields=["table_name", "record_id"], name="idx_audit_tbl_rec"),
            models.Index(fields=["created_at"], name="idx_audit_created_at"),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.created_at} - {self.action} on {self.table_name}:{self.record_id}"

class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(max_length=50)
    title = models.CharField(max_length=200)
    body = models.TextField()
    read = models.BooleanField(default=False)
    reference_id = models.CharField(max_length=150, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "notifications"
        indexes = [
            models.Index(fields=["user", "read"], name="idx_notif_user_read"),
            models.Index(fields=["user", "reference_id"], name="idx_notif_user_ref"),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} -> {self.user.email}"

class Announcement(SoftDeleteModel):
    AUDIENCE_CHOICES = (
        ("caregiver", "Caregiver"),
        ("client", "Client"),
        ("all", "All"),
        ("administrator", "Administrator"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    state = models.ForeignKey(
        State,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="announcements",
    )
    title = models.CharField(max_length=200)
    body = models.TextField()
    audience = models.CharField(max_length=50, choices=AUDIENCE_CHOICES, default="all")
    active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_announcements",
    )

    class Meta:
        db_table = "announcements"
        indexes = [
            models.Index(fields=["state", "audience", "active"], name="idx_ann_state_aud"),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.audience})"
