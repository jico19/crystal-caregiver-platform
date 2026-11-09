from django.db import models

from .base import ScopedRecord, actor, relation


# Preserve original version-bound answers and application review status.
class CaregiverApplication(ScopedRecord):
    caregiver = relation("operations.Caregiver")
    form_version = relation("operations.FormVersion")
    submitted_answers = models.JSONField(default=dict)
    status = models.CharField(max_length=32, default="draft")
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [
            models.CheckConstraint(condition=models.Q(status__in=["draft", "submitted", "under_review", "approved", "rejected"]), name="application_valid_status"),
        ]
        indexes = ScopedRecord.Meta.indexes + [
            models.Index(fields=["branch", "status", "created_at"], name="application_work_queue")
        ]


# Store illustrative intake answers and their original form/referral references.
class ClientIntake(ScopedRecord):
    client = relation("operations.Client")
    referral = relation("operations.ClientReferral", null=True, blank=True)
    form_version = relation("operations.FormVersion")
    submitted_answers = models.JSONField(default=dict)
    status = models.CharField(max_length=32, default="draft")
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta(ScopedRecord.Meta):
        indexes = ScopedRecord.Meta.indexes + [
            models.Index(fields=["branch", "status", "created_at"], name="intake_work_queue")
        ]


# Share before/after status, reviewer, timestamp and comment fields for history.
class Review(ScopedRecord):
    previous_status = models.CharField(max_length=32)
    new_status = models.CharField(max_length=32)
    reviewer = actor()
    comment = models.TextField(blank=True)
    reviewed_at = models.DateTimeField()

    class Meta(ScopedRecord.Meta):
        abstract = True


# Attach status review history to its caregiver application.
class ApplicationReview(Review):
    application = relation(CaregiverApplication)


# Attach status review history to its client intake.
class IntakeReview(Review):
    intake = relation(ClientIntake)
