import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.core.models import State, SoftDeleteModel
from apps.caregivers.models import Caregiver
from apps.clients.models import Client

class CarePlan(SoftDeleteModel):
    STATUS_CHOICES = (
        ("active", "Active"),
        ("pending", "Pending"),
        ("inactive", "Inactive"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="care_plan",
    )
    state = models.ForeignKey(State, on_delete=models.PROTECT, related_name="care_plans")
    caregiver = models.ForeignKey(
        Caregiver,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_care_plans",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    effective_date = models.DateField(default=timezone.now)
    primary_nurse = models.CharField(max_length=200)
    emergency_protocol = models.TextField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="authored_care_plans",
    )

    class Meta:
        db_table = "care_plans"
        indexes = [
            models.Index(fields=["state"], name="idx_care_plans_state"),
        ]

    def __str__(self):
        return f"Care Plan - Client {self.client_id} ({self.status})"

class CarePlanActivity(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    care_plan = models.ForeignKey(
        CarePlan,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    task = models.CharField(max_length=200)
    frequency = models.CharField(max_length=100, default="Daily")
    notes = models.TextField(blank=True, null=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = "care_plan_activities"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.task} ({self.frequency})"

class CareSchedule(SoftDeleteModel):
    DAYS_OF_WEEK = (
        ("Monday", "Monday"),
        ("Tuesday", "Tuesday"),
        ("Wednesday", "Wednesday"),
        ("Thursday", "Thursday"),
        ("Friday", "Friday"),
        ("Saturday", "Saturday"),
        ("Sunday", "Sunday"),
    )
    STATUS_CHOICES = (
        ("scheduled", "Scheduled"),
        ("confirmed", "Confirmed"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="care_schedules",
    )
    caregiver = models.ForeignKey(
        Caregiver,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="care_schedules",
    )
    state = models.ForeignKey(State, on_delete=models.PROTECT, related_name="care_schedules")
    day_of_week = models.CharField(max_length=20, choices=DAYS_OF_WEEK)
    start_time = models.TimeField()
    end_time = models.TimeField()
    service = models.CharField(max_length=200, default="Personal Care")
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="scheduled")

    class Meta:
        db_table = "care_schedules"
        indexes = [
            models.Index(fields=["client", "day_of_week"], name="idx_sched_client_day"),
            models.Index(fields=["caregiver", "day_of_week"], name="idx_sched_cg_day"),
        ]

    def __str__(self):
        return f"{self.day_of_week} {self.start_time}-{self.end_time}: {self.service}"

class CaregiverClientAssignment(models.Model):
    ROLE_CHOICES = (
        ("primary", "Primary"),
        ("relief", "Relief"),
        ("backup", "Backup"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    caregiver = models.ForeignKey(
        Caregiver,
        on_delete=models.CASCADE,
        related_name="client_assignments",
    )
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="caregiver_assignments",
    )
    role = models.CharField(max_length=40, choices=ROLE_CHOICES, default="primary")
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="made_assignments",
    )
    assigned_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "caregiver_client_assignments"
        indexes = [
            models.Index(fields=["caregiver", "client"], name="idx_cg_client_assignment"),
        ]

    def __str__(self):
        return f"{self.caregiver.first_name} -> {self.client.first_name} ({self.role})"
