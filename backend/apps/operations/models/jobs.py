from django.db import models
from .base import ScopedRecord, relation, unique


# Link a branch's illustrative opportunity to its published application form version.
class JobPosting(ScopedRecord):
    title = models.CharField(max_length=200)
    description = models.TextField()
    published = models.BooleanField(default=False)
    form_version = relation("operations.FormVersion")


# Link a caregiver and opportunity to one application, preventing duplicate job submissions.
class JobSubmission(ScopedRecord):
    job = relation(JobPosting)
    caregiver = relation("operations.Caregiver")
    application = models.OneToOneField("operations.CaregiverApplication", on_delete=models.PROTECT)

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [
            unique("job", "caregiver", name="one_application_per_job")
        ]
