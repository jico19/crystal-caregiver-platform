import uuid
from django.db import models
from django.conf import settings
from apps.core.models import State, SoftDeleteModel
from apps.clients.models import Client
from apps.caregivers.models import Caregiver

class Authorization(SoftDeleteModel):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("active", "Active"),
        ("expiring_soon", "Expiring Soon"),
        ("expired", "Expired"),
        ("rejected", "Rejected"),
    )
    UNIT_CHOICES = (
        ("15_min", "15 Min"),
        ("hourly", "Hourly"),
        ("visit", "Visit"),
    )
    SOURCE_CHOICES = (
        ("admin", "Admin"),
        ("client", "Client"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="authorizations")
    state = models.ForeignKey(State, on_delete=models.PROTECT, related_name="authorizations")
    caregiver = models.ForeignKey(
        Caregiver,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="authorizations",
    )
    authorization_number = models.CharField(max_length=100)
    hcpcs_code = models.CharField(max_length=20, default="T1019")
    service_description = models.CharField(max_length=150, default="Personal Care Services")
    unit_type = models.CharField(max_length=20, choices=UNIT_CHOICES, default="15_min")
    total_units_authorized = models.IntegerField(default=0)
    units_used = models.IntegerField(default=0)
    max_weekly_hours = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="admin")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_authorizations",
    )
    document = models.ForeignKey(
        "documents.Document",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="linked_authorizations",
    )

    class Meta:
        db_table = "authorizations"
        indexes = [
            models.Index(fields=["state", "status"], name="idx_auth_state_status"),
            models.Index(fields=["client"], name="idx_auth_client"),
            models.Index(fields=["end_date"], name="idx_auth_end_date"),
        ]
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.authorization_number} - {self.client.first_name} {self.client.last_name}"

    @property
    def remaining_units(self):
        return max(0, self.total_units_authorized - self.units_used)

    @property
    def burndown_percentage(self):
        if self.total_units_authorized == 0:
            return 0.0
        return round((self.units_used / self.total_units_authorized) * 100, 1)
