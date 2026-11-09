from django.contrib import admin
from .models import DocumentType, DocumentRequirement, Document

@admin.register(DocumentType)
class DocumentTypeAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "for_role", "requires_expiration", "created_at")
    list_filter = ("for_role", "requires_expiration")
    search_fields = ("name",)

@admin.register(DocumentRequirement)
class DocumentRequirementAdmin(admin.ModelAdmin):
    list_display = ("id", "state", "document_type", "for_role", "required", "created_at")
    list_filter = ("state", "for_role", "required")
    search_fields = ("document_type__name",)

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "document_type", "state", "status", "expiration_date", "legal_hold", "created_at")
    list_filter = ("state", "status", "legal_hold", "document_type")
    search_fields = ("owner__email", "storage_path", "rejection_reason")
