from django.contrib import admin
from .models import TrainingCourse, TrainingEnrollment

@admin.register(TrainingCourse)
class TrainingCourseAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "duration_hours", "validity_months", "active", "created_at")
    list_filter = ("active",)
    search_fields = ("name", "description")

@admin.register(TrainingEnrollment)
class TrainingEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("id", "course", "caregiver", "status", "due_at", "enrolled_at", "completed_at")
    list_filter = ("status", "course")
    search_fields = ("caregiver__first_name", "caregiver__last_name", "course__name")
