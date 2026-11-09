from django.db import models
from django.db.models import Q

from .base import ScopedRecord, actor, relation, unique, one_subject


# Group branch-specific forms by audience and workflow purpose.
class FormTemplate(ScopedRecord):
    audience = models.CharField(max_length=16)
    kind = models.CharField(max_length=32)
    title = models.CharField(max_length=200)
    active = models.BooleanField(default=True)


# Preserve a numbered schema, wording, and optional private packet at publication.
class FormVersion(ScopedRecord):
    template = relation(FormTemplate)
    version_number = models.PositiveIntegerField()
    field_schema = models.JSONField(default=dict)
    instruction_text = models.TextField(blank=True)
    consent_text = models.TextField(blank=True)
    packet_file = relation("operations.StoredFile", null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [
            unique("template", "version_number", name="form_version_unique"),
            models.CheckConstraint(condition=Q(version_number__gt=0), name="form_version_positive"),
        ]


# Associate illustrative signing requests with their subject, form and intended signer.
class SignatureRequest(ScopedRecord):
    form_version = relation(FormVersion)
    caregiver = relation("operations.Caregiver", null=True, blank=True)
    client = relation("operations.Client", null=True, blank=True)
    application = relation("operations.CaregiverApplication", null=True, blank=True)
    intake = relation("operations.ClientIntake", null=True, blank=True)
    rendered_file = relation("operations.StoredFile")
    requested_signer = actor()
    status = models.CharField(max_length=24, default="pending")

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [
            one_subject("signature_one_subject"),
            models.CheckConstraint(
                condition=Q(application__isnull=True) | Q(caregiver__isnull=False),
                name="signature_application_subject",
            ),
            models.CheckConstraint(
                condition=Q(intake__isnull=True) | Q(client__isnull=False),
                name="signature_intake_subject",
            ),
        ]


# Preserve illustrative signer/consent/file evidence without claiming legal validity.
class SignatureEvent(ScopedRecord):
    request = models.OneToOneField(SignatureRequest, on_delete=models.PROTECT)
    signer = actor()
    signer_name_snapshot = models.CharField(max_length=200)
    consent_text_snapshot = models.TextField()
    signed_at = models.DateTimeField()
    signed_file = relation("operations.StoredFile")
    document_hash = models.CharField(max_length=64)
    provider_reference = models.CharField(max_length=255, blank=True)
