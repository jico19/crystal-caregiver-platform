import uuid
from django.db import models
from django.utils import timezone
from apps.caregivers.models import Caregiver

class TrainingCourse(models.Model):
    name = models.CharField(max_length=200, unique=True)
    duration_hours = models.DecimalField(max_digits=4, decimal_places=1, default=1.0)
    validity_months = models.IntegerField(default=12)
    active = models.BooleanField(default=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "training_courses"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.duration_hours}h)"

class TrainingEnrollment(models.Model):
    STATUS_CHOICES = (
        ("not_started", "Not Started"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(TrainingCourse, on_delete=models.CASCADE, related_name="enrollments")
    caregiver = models.ForeignKey(Caregiver, on_delete=models.CASCADE, related_name="training_enrollments")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="not_started")
    due_at = models.DateField(null=True, blank=True)
    enrolled_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "training_enrollments"
        unique_together = ("course", "caregiver")
        indexes = [
            models.Index(fields=["caregiver", "due_at"], name="idx_train_enr_due"),
        ]

    def __str__(self):
        return f"{self.course.name} - {self.caregiver.first_name} ({self.status})"
