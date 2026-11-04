from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("id", "email", "role", "state", "status", "is_staff", "is_active", "created_at")
    list_filter = ("role", "state", "status", "is_staff", "is_active")
    search_fields = ("email",)
    ordering = ("email",)

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Permissions & Roles", {"fields": ("role", "state", "status", "is_staff", "is_active", "is_superuser", "groups", "user_permissions")}),
        ("HIPAA Audit", {"fields": ("deleted_at", "deleted_by")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "password", "role", "state", "status"),
        }),
    )
