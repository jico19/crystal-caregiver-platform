import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class TimeStampedModel(models.Model):
    """Abstract base model with automated timestamp tracking."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class SoftDeleteModel(TimeStampedModel):
    """Abstract base model supporting HIPAA audit-safe soft deletion."""
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_deleted",
    )

    class Meta:
        abstract = True

    def soft_delete(self, user=None):
        self.deleted_at = timezone.now()
        if user and user.is_authenticated:
            self.deleted_by = user
        self.save()

    def restore(self):
        self.deleted_at = None
        self.deleted_by = None
        self.save()

class State(TimeStampedModel):
    """Operational state jurisdiction (FL, IN, GA)."""
    code = models.CharField(max_length=2, unique=True)
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True)
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "states"
        ordering = ["id"]

    def __str__(self):
        return f"{self.name} ({self.code})"

class Role(models.Model):
    """RBAC security role tier."""
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "roles"
        ordering = ["id"]

    def __str__(self):
        return self.name
