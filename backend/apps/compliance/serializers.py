from rest_framework import serializers
from apps.core.models import State
from .models import AuditLog, Notification, Announcement

class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    state_code = serializers.CharField(source="entity_state.code", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id", "user_id", "user_email", "action", "table_name", "record_id",
            "old_values", "new_values", "ip_address", "user_agent",
            "request_id", "entity_state_id", "state_code", "created_at"
        ]

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "type", "title", "body", "read", "reference_id", "created_at"]

class AnnouncementSerializer(serializers.ModelSerializer):
    state_code = serializers.CharField(source="state.code", read_only=True)

    class Meta:
        model = Announcement
        fields = ["id", "state_id", "state_code", "title", "body", "audience", "active", "created_at"]

class AdminAnnouncementSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(source="active", read_only=True)
    state_id = serializers.PrimaryKeyRelatedField(
        source="state", queryset=State.objects.all(), required=False, allow_null=True,
    )
    states = serializers.SerializerMethodField()
    users = serializers.SerializerMethodField()
    audience_label = serializers.CharField(source="get_audience_display", read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id", "title", "body", "audience", "audience_label",
            "is_active", "states", "users", "state_id", "created_at"
        ]
        read_only_fields = ["id", "created_at"]

    def get_states(self, obj):
        if not obj.state_id:
            return None
        return {"id": obj.state_id, "code": obj.state.code, "name": obj.state.name}

    def get_users(self, obj):
        if not obj.created_by_id:
            return None
        return {"id": obj.created_by_id, "email": obj.created_by.email}
