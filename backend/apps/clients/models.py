import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.core.models import State, SoftDeleteModel

class Client(SoftDeleteModel):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("active", "Active"),
        ("discharged", "Discharged"),
        ("rejected", "Rejected"),
    )

    id = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        primary_key=True,
        db_column="id",
        related_name="client_profile",
    )
    state = models.ForeignKey(State, on_delete=models.PROTECT, related_name="clients")
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    medicaid_number = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    service_start_date = models.DateField(null=True, blank=True)
    admitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admitted_clients",
    )
    admitted_at = models.DateTimeField(null=True, blank=True)
    admission_notes = models.TextField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    signature_data = models.TextField(blank=True, null=True)
    signed_name = models.CharField(max_length=200, blank=True, null=True)
    signed_at = models.DateTimeField(null=True, blank=True)
    legal_hold = models.BooleanField(default=False)

    class Meta:
        db_table = "clients"
        indexes = [
            models.Index(fields=["state", "status"], name="idx_client_state_status"),
            models.Index(fields=["legal_hold"], name="idx_client_legal_hold"),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.status})"

class ClientReferral(SoftDeleteModel):
    STATUS_CHOICES = (
        ("new", "New"),
        ("contacted", "Contacted"),
        ("converted", "Converted"),
        ("closed", "Closed"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    state = models.ForeignKey(State, on_delete=models.PROTECT, related_name="referrals")
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    email = models.EmailField(max_length=255, blank=True, null=True)
    referral_source = models.CharField(max_length=100, default="Website")
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new")
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_referrals",
    )
    handled_notes = models.TextField(blank=True, null=True)
    converted_client = models.ForeignKey(
        Client,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="converted_from_referral",
    )

    class Meta:
        db_table = "client_referrals"
        indexes = [
            models.Index(fields=["state", "status"], name="idx_referral_state_status"),
        ]

    def __str__(self):
        return f"Referral: {self.first_name} {self.last_name} ({self.status})"

class ClientAgreement(models.Model):
    """Append-only table for digitally signed legal agreements."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="client_agreements",
    )
    state = models.ForeignKey(State, on_delete=models.PROTECT, related_name="agreements")
    agreement_key = models.CharField(max_length=100)
    title = models.CharField(max_length=200)
    version = models.IntegerField(default=1)
    body = models.TextField()
    signature_data = models.TextField()
    signed_name = models.CharField(max_length=200)
    signed_at = models.DateTimeField(default=timezone.now)
    content_hash = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "client_agreements"
        indexes = [
            models.Index(fields=["client", "agreement_key"], name="idx_client_agreements_key"),
        ]

    def __str__(self):
        return f"{self.title} - Client {self.client_id} (v{self.version})"
