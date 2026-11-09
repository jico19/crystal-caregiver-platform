"""Caregiver application inputs, original forms, and review history representations."""

from rest_framework import serializers
from apps.accounts.serializers.inputs import PasswordInput
from ..models import FormVersion, CaregiverApplication, ApplicationReview


# Validate synthetic caregiver application fields in the domain that owns them.
class ApplicationInput(PasswordInput):
    experience = serializers.CharField(required=False)
    availability = serializers.ListField(child=serializers.CharField(), required=False)
    name = serializers.CharField(max_length=200)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)
    demo_acknowledged = serializers.BooleanField()

    def validate_demo_acknowledged(self, value):
        if not value:
            raise serializers.ValidationError("Use synthetic data only and acknowledge the demo.")
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.is_authenticated and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Required for a new account."})
        return attrs


# Keep application-list fields separate from the detailed historical record.
class ApplicationSerializer(serializers.ModelSerializer):
    state_code = serializers.CharField(source="branch.state_code", read_only=True)

    class Meta:
        model = CaregiverApplication
        fields = ["public_id", "state_code", "status", "submitted_at"]


class FormVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormVersion
        fields = ["public_id", "version_number", "field_schema"]


class ApplicationReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationReview
        fields = ["public_id", "previous_status", "new_status", "comment", "reviewed_at"]


class ApplicationDetailSerializer(serializers.ModelSerializer):
    state_code = serializers.CharField(source="branch.state_code")
    caregiver = serializers.UUIDField(source="caregiver.public_id")
    form = FormVersionSerializer(source="form_version")
    reviews = ApplicationReviewSerializer(source="applicationreview_set", many=True)
    packet_available = serializers.SerializerMethodField()

    def get_packet_available(self, obj) -> bool:
        return obj.form_version.packet_file_id is not None

    class Meta:
        model = CaregiverApplication
        fields = ["public_id", "caregiver", "state_code", "status", "submitted_at", "submitted_answers", "form", "reviews", "packet_available"]
