from django.db import models
from django.db.models import Q

from .base import Record, ScopedRecord, actor, relation, unique, date_range


# Define reusable illustrative training content separately from assignments.
class TrainingCourse(Record):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    active = models.BooleanField(default=True)


# Preserve numbered published training content for assignment evidence.
class TrainingCourseVersion(Record):
    course = relation(TrainingCourse)
    version_number = models.PositiveIntegerField()
    content = models.TextField()
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            unique("course", "version_number", name="course_version_unique"),
            models.CheckConstraint(
                condition=Q(version_number__gt=0), name="course_version_positive"
            ),
        ]


# Track a caregiver's specific course version, due date, progress and completion times.
class TrainingAssignment(ScopedRecord):
    caregiver = relation("operations.Caregiver")
    course_version = relation(TrainingCourseVersion)
    assigned_by = actor()
    assigned_at = models.DateTimeField()
    due_at = models.DateTimeField(null=True, blank=True, db_index=True)
    required = models.BooleanField(default=False)
    progress_percent = models.PositiveSmallIntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta(ScopedRecord.Meta):
        constraints = ScopedRecord.Meta.constraints + [
            models.CheckConstraint(
                condition=Q(progress_percent__lte=100), name="training_progress_range"
            ),
            date_range("started_at", "completed_at", "training_completion_dates"),
        ]


# Link one stored certificate artifact to its assignment's completion evidence.
class TrainingCertificate(ScopedRecord):
    assignment = models.OneToOneField(TrainingAssignment, on_delete=models.PROTECT)
    file = relation("operations.StoredFile")
    issued_at = models.DateTimeField()
    certificate_reference = models.CharField(max_length=100, unique=True)
