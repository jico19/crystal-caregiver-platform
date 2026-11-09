from django.contrib import admin
from .models import AuditLog, Notification, Announcement

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "action", "table_name", "record_id", "entity_state", "created_at")
    list_filter = ("action", "table_name", "entity_state")
    search_fields = ("table_name", "record_id", "user__email", "action")
    readonly_fields = ("id", "user", "action", "table_name", "record_id", "old_values", "new_values", "ip_address", "user_agent", "request_id", "entity_state", "created_at")

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "type", "title", "read", "created_at")
    list_filter = ("type", "read")
    search_fields = ("user__email", "title", "body")

@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "state", "audience", "active", "created_by", "created_at")
    list_filter = ("state", "audience", "active")
    search_fields = ("title", "body")
