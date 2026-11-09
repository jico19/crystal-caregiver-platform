from rest_framework import serializers
from .models import FormVersion, CaregiverApplication, ApplicationReview


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
