from django.contrib import admin
from .models import Client, ClientReferral, ClientAgreement

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("id", "first_name", "last_name", "state", "status", "medicaid_number", "legal_hold", "created_at")
    list_filter = ("state", "status", "legal_hold")
    search_fields = ("first_name", "last_name", "medicaid_number", "phone", "id__email")

@admin.register(ClientReferral)
class ClientReferralAdmin(admin.ModelAdmin):
    list_display = ("id", "state", "first_name", "last_name", "phone", "referral_source", "status", "created_at")
    list_filter = ("state", "status", "referral_source")
    search_fields = ("first_name", "last_name", "phone", "email")

@admin.register(ClientAgreement)
class ClientAgreementAdmin(admin.ModelAdmin):
    list_display = ("id", "client", "state", "agreement_key", "title", "version", "signed_name", "signed_at")
    list_filter = ("state", "agreement_key")
    search_fields = ("title", "agreement_key", "signed_name", "content_hash")
    readonly_fields = ("id", "client", "state", "agreement_key", "title", "version", "body", "signature_data", "signed_name", "signed_at", "content_hash", "created_at")
