import uuid
from django.db import models
from apps.core.models import State, TimeStampedModel, SoftDeleteModel

class WebsiteContent(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name="website_contents")
    section_key = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    content = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "website_content"
        indexes = [
            models.Index(fields=["state", "section_key"], name="idx_web_state_sec"),
        ]

    def __str__(self):
        return f"{self.state.code} - {self.section_key} - {self.title}"

class Service(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name="services")
    title = models.CharField(max_length=200)
    description = models.TextField()
    icon_name = models.CharField(max_length=50, blank=True, null=True)
    sort_order = models.IntegerField(default=0)
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "services"
        ordering = ["sort_order", "title"]

    def __str__(self):
        return f"{self.state.code} - {self.title}"

class Form(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name="forms")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    file_path = models.TextField()
    file_size_bytes = models.BigIntegerField(default=0)
    category = models.CharField(max_length=50, default="general")

    class Meta:
        db_table = "forms"

    def __str__(self):
        return f"{self.state.code} - {self.title}"

class LicensingInfo(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name="licensing_records")
    license_number = models.CharField(max_length=100)
    issuing_authority = models.CharField(max_length=200)
    status = models.CharField(max_length=50, default="Active")
    verified_at = models.DateTimeField(null=True, blank=True)
    disclosures = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "licensing_info"

    def __str__(self):
        return f"{self.state.code} License {self.license_number}"

class JobPosting(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name="job_postings")
    title = models.CharField(max_length=200)
    department = models.CharField(max_length=100, default="Caregiver Services")
    employment_type = models.CharField(max_length=50, default="Full-Time")
    description = models.TextField()
    requirements = models.TextField()
    compensation = models.CharField(max_length=100, blank=True, null=True)
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "job_postings"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.state.code} - {self.title}"
