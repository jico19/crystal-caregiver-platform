from rest_framework import serializers
from apps.core.storage import storage_service
from apps.documents.models import Document
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

    def validate(self, attrs):
        if attrs["end_date"] < attrs["start_date"]:
            raise serializers.ValidationError({"end_date": "End date must be on or after start date."})
        return attrs


class ClientAuthorizationCreateSerializer(AuthorizationCreateSerializer):
    authorization_number = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    document = serializers.PrimaryKeyRelatedField(queryset=Document.objects.filter(deleted_at__isnull=True))

    class Meta(AuthorizationCreateSerializer.Meta):
        fields = ["authorization_number", "start_date", "end_date", "document"]

    def validate_document(self, document):
        user = self.context["request"].user
        client = self.context["client"]
        if document.owner_id != user.id or document.state_id != client.state_id or client.state_id != user.state_id:
            raise serializers.ValidationError("Choose a document uploaded to your own client account and state.")
        if document.document_type.name != "Authorizations" or document.document_type.for_role not in ("client", "both"):
            raise serializers.ValidationError("Choose a document uploaded under Authorizations.")
        if not storage_service.exists(document.storage_path):
            raise serializers.ValidationError("Finish uploading the authorization document before submitting it.")
        return document
