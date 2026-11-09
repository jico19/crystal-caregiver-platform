from django.contrib import admin
from .models import State, Role

@admin.register(State)
class StateAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "name", "slug", "active", "created_at")
    list_filter = ("active",)
    search_fields = ("code", "name", "slug")

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "description", "created_at")
    search_fields = ("name",)
