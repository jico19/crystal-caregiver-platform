from django.contrib import admin
from .models import Authorization

@admin.register(Authorization)
class AuthorizationAdmin(admin.ModelAdmin):
    list_display = (
        "id", "authorization_number", "client", "state", "status",
        "hcpcs_code", "total_units_authorized", "units_used", "start_date", "end_date"
    )
    list_filter = ("state", "status", "unit_type", "source")
    search_fields = ("authorization_number", "client__first_name", "client__last_name", "hcpcs_code")
