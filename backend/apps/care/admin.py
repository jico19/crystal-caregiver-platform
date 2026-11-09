from django.contrib import admin
from .models import CarePlan, CarePlanActivity, CareSchedule, CaregiverClientAssignment

class CarePlanActivityInline(admin.TabularInline):
    model = CarePlanActivity
    extra = 1

@admin.register(CarePlan)
class CarePlanAdmin(admin.ModelAdmin):
    list_display = ("id", "client", "state", "caregiver", "status", "effective_date", "primary_nurse")
    list_filter = ("state", "status")
    search_fields = ("client__email", "primary_nurse")
    inlines = [CarePlanActivityInline]

@admin.register(CareSchedule)
class CareScheduleAdmin(admin.ModelAdmin):
    list_display = ("id", "client", "caregiver", "state", "day_of_week", "start_time", "end_time", "service", "status")
    list_filter = ("state", "day_of_week", "status")
    search_fields = ("client__email", "service")

@admin.register(CaregiverClientAssignment)
class CaregiverClientAssignmentAdmin(admin.ModelAdmin):
    list_display = ("id", "caregiver", "client", "role", "assigned_at", "ended_at")
    list_filter = ("role",)
    search_fields = ("caregiver__first_name", "caregiver__last_name", "client__first_name", "client__last_name")
