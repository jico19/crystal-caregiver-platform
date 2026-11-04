import uuid
from django.db import models
from django.conf import settings
from apps.core.models import State, SoftDeleteModel

class DocumentType(models.Model):
    ROLE_CHOICES = (
        ("caregiver", "Caregiver"),
        ("client", "Client"),
        ("both", "Both"),
    )

    name = models.CharField(max_length=100, unique=True)
    for_role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="both")
    requires_expiration = models.BooleanField(default=False)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "document_types"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.for_role})"

class DocumentRequirement(models.Model):
    ROLE_CHOICES = (
        ("caregiver", "Caregiver"),
        ("client", "Client"),
        ("both", "Both"),
    )

    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name="document_requirements")
    document_type = models.ForeignKey(DocumentType, on_delete=models.CASCADE, related_name="state_requirements")
    for_role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="caregiver")
    required = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "document_requirements"
        unique_together = ("state", "document_type", "for_role")

    def __str__(self):
        return f"{self.state.code} - {self.document_type.name} ({'Required' if self.required else 'Optional'})"

class Document(SoftDeleteModel):
    STATUS_CHOICES = (
        ("pending_review", "Pending Review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("expired", "Expired"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    document_type = models.ForeignKey(
        DocumentType,
        on_delete=models.PROTECT,
        related_name="documents",
    )
    state = models.ForeignKey(State, on_delete=models.PROTECT, related_name="documents")
    storage_path = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending_review")
    expiration_date = models.DateField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_documents",
    )
    rejection_reason = models.TextField(blank=True, null=True)
    legal_hold = models.BooleanField(default=False)

    class Meta:
        db_table = "documents"
        indexes = [
            models.Index(fields=["state", "status"], name="idx_docs_state_status"),
            models.Index(fields=["owner"], name="idx_docs_owner"),
            models.Index(fields=["expiration_date"], name="idx_docs_expiration"),
            models.Index(fields=["legal_hold"], name="idx_docs_legal_hold"),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.document_type.name} - {self.owner.email} ({self.status})"
