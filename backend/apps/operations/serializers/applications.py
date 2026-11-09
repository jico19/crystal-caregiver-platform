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

    # Require acknowledgement that submitted applicant data is synthetic.
    def validate_demo_acknowledged(self, value):
        if not value:
            raise serializers.ValidationError("Use synthetic data only and acknowledge the demo.")
        return value

    # Require a password only when the request must create a new account.
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


# Expose the original form version number and published answer schema.
class FormVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormVersion
        fields = ["public_id", "version_number", "field_schema"]


# Represent recorded status transitions and review comments.
class ApplicationReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationReview
        fields = ["public_id", "previous_status", "new_status", "comment", "reviewed_at"]


# Combine original answers, versioned schema, review history and packet availability.
class ApplicationDetailSerializer(serializers.ModelSerializer):
    state_code = serializers.CharField(source="branch.state_code")
    caregiver = serializers.UUIDField(source="caregiver.public_id")
    form = FormVersionSerializer(source="form_version")
    reviews = ApplicationReviewSerializer(source="applicationreview_set", many=True)
    packet_available = serializers.SerializerMethodField()

    # Report attachment availability without exposing a private storage location.
    def get_packet_available(self, obj) -> bool:
        return obj.form_version.packet_file_id is not None

    class Meta:
        model = CaregiverApplication
        fields = ["public_id", "caregiver", "state_code", "status", "submitted_at", "submitted_answers", "form", "reviews", "packet_available"]
