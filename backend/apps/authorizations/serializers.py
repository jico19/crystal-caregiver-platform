from rest_framework import serializers
from .models import Authorization

class AuthorizationSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    remaining_units = serializers.ReadOnlyField()
    burndown_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Authorization
        fields = [
            "id", "client_id", "client_name", "state_id", "caregiver_id",
            "authorization_number", "hcpcs_code", "service_description",
            "unit_type", "total_units_authorized", "units_used", "remaining_units",
            "burndown_percentage", "max_weekly_hours", "start_date", "end_date",
            "status", "source", "reviewed_at", "document_id", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_client_name(self, obj):
        return f"{obj.client.first_name} {obj.client.last_name}"

class AuthorizationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Authorization
        fields = [
            "authorization_number", "hcpcs_code", "service_description",
            "unit_type", "total_units_authorized", "max_weekly_hours",
            "start_date", "end_date", "caregiver", "document"
        ]
