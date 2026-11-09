from django.db import models
from .base import ScopedRecord, relation, unique


class JobPosting(ScopedRecord):
    title = models.CharField(max_length=200)
    description = models.TextField()
    published = models.BooleanField(default=False)
    form_version = relation("operations.FormVersion")


class JobSubmission(ScopedRecord):
    job = relation(JobPosting)
    caregiver = relation("operations.Caregiver")
    application = models.OneToOneField("operations.CaregiverApplication", on_delete=models.PROTECT)

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [unique("job", "caregiver", name="one_application_per_job")]
