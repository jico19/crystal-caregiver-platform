from django.contrib import admin
from .models import Caregiver, CaregiverApplication

@admin.register(Caregiver)
class CaregiverAdmin(admin.ModelAdmin):
    list_display = ("id", "first_name", "last_name", "state", "phone", "legal_hold", "created_at")
    list_filter = ("state", "legal_hold")
    search_fields = ("first_name", "last_name", "phone", "id__email")

@admin.register(CaregiverApplication)
class CaregiverApplicationAdmin(admin.ModelAdmin):
    list_display = ("id", "caregiver", "state", "status", "version", "submitted_at", "reviewed_at")
    list_filter = ("state", "status")
    search_fields = ("caregiver__first_name", "caregiver__last_name", "signed_name", "content_hash")
