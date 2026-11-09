from django.db import models

from .base import ScopedRecord, unique, relation


class BranchContent(ScopedRecord):
    content_key = models.SlugField(max_length=100)
    title = models.CharField(max_length=200)
    body = models.TextField()
    publication_status = models.CharField(max_length=24, default="draft")

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [
            unique("branch", "content_key", name="branch_content_key")
        ]


class WebsiteInquiry(ScopedRecord):
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    subject = models.CharField(max_length=200)
    message = models.TextField()
    submitted_at = models.DateTimeField()
    status = models.CharField(max_length=32, default="submitted")


class ReferralSource(ScopedRecord):
    name = models.CharField(max_length=200)
    source_type = models.CharField(max_length=64, blank=True)
    active = models.BooleanField(default=True)


class ClientReferral(ScopedRecord):
    client = relation("operations.Client")
    source = relation(ReferralSource, null=True, blank=True)
    source_name_snapshot = models.CharField(max_length=200, blank=True)
    referrer_contact = models.CharField(max_length=255, blank=True)
    received_at = models.DateTimeField()
    status = models.CharField(max_length=32, default="submitted")

    class Meta(ScopedRecord.Meta):
        indexes = ScopedRecord.Meta.indexes + [
            models.Index(fields=["branch", "source", "received_at"], name="referral_source_report")
        ]
