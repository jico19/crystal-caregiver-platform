from django.db import models
from django.db.models import Q

from .base import Record, ScopedRecord, actor, relation, unique, one_subject, date_range


# Record private byte metadata and storage keys rather than public media URLs.
class StoredFile(ScopedRecord):
    private_storage_key = models.CharField(max_length=500, unique=True)
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=128)
    byte_size = models.PositiveBigIntegerField()
    sha256 = models.CharField(max_length=64)
    uploaded_by = actor(null=True, blank=True)
    validation_status = models.CharField(max_length=24, default="pending")

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [
            models.CheckConstraint(condition=Q(byte_size__gt=0), name="file_nonempty")
        ]


# Define available categories without imposing branch-specific requirements.
class DocumentType(Record):
    code = models.SlugField(max_length=80, unique=True)
    label = models.CharField(max_length=200)
    audience = models.CharField(
        max_length=16, choices=[("caregiver", "Caregiver"), ("client", "Client")]
    )
    active = models.BooleanField(default=True)


# Configure illustrative required/expiry rules per branch and category.
class BranchDocumentRequirement(ScopedRecord):
    document_type = relation(DocumentType)
    required = models.BooleanField(default=False)
    tracks_expiration = models.BooleanField(default=False)
    active = models.BooleanField(default=True)

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [
            unique("branch", "document_type", name="branch_document_type")
        ]


# Associate a document category with exactly one caregiver or client.
class Document(ScopedRecord):
    document_type = relation(DocumentType)
    caregiver = relation("operations.Caregiver", null=True, blank=True)
    client = relation("operations.Client", null=True, blank=True)

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [
            one_subject("document_one_subject"),
            models.UniqueConstraint(fields=["caregiver", "document_type"], condition=Q(caregiver__isnull=False), name="caregiver_document_category"),
        ]


# Preserve numbered file submissions and their review/expiry metadata.
class DocumentVersion(ScopedRecord):
    document = relation(Document)
    version_number = models.PositiveIntegerField()
    file = relation(StoredFile)
    issued_on = models.DateField(null=True, blank=True)
    expires_on = models.DateField(null=True, blank=True, db_index=True)
    submitted_at = models.DateTimeField()
    review_status = models.CharField(max_length=24, default="pending")

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [
            unique("document", "version_number", name="document_version_unique"),
            models.CheckConstraint(
                condition=Q(version_number__gt=0), name="document_version_positive"
            ),
            date_range("issued_on", "expires_on", "document_dates"),
            models.CheckConstraint(
                condition=Q(review_status__in=["pending", "approved", "rejected"]),
                name="document_review_status",
            ),
        ]


# Record one terminal decision and reviewer evidence for a version.
class DocumentReview(ScopedRecord):
    document_version = relation(DocumentVersion)
    reviewer = actor()
    decision = models.CharField(
        max_length=16, choices=[("approved", "Approved"), ("rejected", "Rejected")]
    )
    comment = models.TextField(blank=True)
    reviewed_at = models.DateTimeField()

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [
            unique("document_version", name="one_document_review"),
            models.CheckConstraint(
                condition=Q(decision__in=["approved", "rejected"]), name="document_review_decision"
            )
        ]
