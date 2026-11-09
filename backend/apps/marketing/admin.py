from django.contrib import admin
from .models import WebsiteContent, Service, Form, LicensingInfo, JobPosting

@admin.register(WebsiteContent)
class WebsiteContentAdmin(admin.ModelAdmin):
    list_display = ("id", "state", "section_key", "title", "updated_at")
    list_filter = ("state", "section_key")
    search_fields = ("title", "section_key", "content")

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("id", "state", "title", "sort_order", "active", "created_at")
    list_filter = ("state", "active")
    search_fields = ("title", "description")

@admin.register(Form)
class FormAdmin(admin.ModelAdmin):
    list_display = ("id", "state", "title", "category", "file_size_bytes", "created_at")
    list_filter = ("state", "category")
    search_fields = ("title", "description")

@admin.register(LicensingInfo)
class LicensingInfoAdmin(admin.ModelAdmin):
    list_display = ("id", "state", "license_number", "issuing_authority", "status", "verified_at")
    list_filter = ("state", "status")
    search_fields = ("license_number", "issuing_authority")

@admin.register(JobPosting)
class JobPostingAdmin(admin.ModelAdmin):
    list_display = ("id", "state", "title", "department", "employment_type", "active", "created_at")
    list_filter = ("state", "department", "employment_type", "active")
    search_fields = ("title", "description", "requirements")
