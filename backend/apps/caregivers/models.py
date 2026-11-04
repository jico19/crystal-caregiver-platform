import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.core.models import State, SoftDeleteModel

class Caregiver(SoftDeleteModel):
    id = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        primary_key=True,
        db_column="id",
        related_name="caregiver_profile",
    )
    state = models.ForeignKey(State, on_delete=models.PROTECT, related_name="caregivers")
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    date_of_birth = models.DateField(null=True, blank=True)
    ssn_last4 = models.CharField(max_length=4, blank=True, null=True)
    legal_hold = models.BooleanField(default=False)

    class Meta:
        db_table = "caregivers"
        indexes = [
            models.Index(fields=["state", "last_name"], name="idx_cg_state_lastname"),
            models.Index(fields=["legal_hold"], name="idx_cg_legal_hold"),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.state.code})"

class CaregiverApplication(SoftDeleteModel):
    STATUS_CHOICES = (
        ("draft", "Draft"),
        ("submitted", "Submitted"),
        ("under_review", "Under Review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("onboarding", "Onboarding"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    caregiver = models.ForeignKey(Caregiver, on_delete=models.CASCADE, related_name="applications")
    state = models.ForeignKey(State, on_delete=models.PROTECT, related_name="caregiver_applications")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="submitted")
    submitted_at = models.DateTimeField(default=timezone.now)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_caregiver_applications",
    )
    notes = models.TextField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    signature_data = models.TextField()
    signed_name = models.CharField(max_length=200)
    signed_at = models.DateTimeField()
    version = models.IntegerField(default=1)
    content_hash = models.TextField()

    class Meta:
        db_table = "caregiver_applications"
        indexes = [
            models.Index(fields=["state", "status"], name="idx_cg_app_state_status"),
            models.Index(fields=["caregiver"], name="idx_cg_app_caregiver"),
        ]
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"App {self.id} - {self.caregiver.first_name} {self.caregiver.last_name} ({self.status})"
