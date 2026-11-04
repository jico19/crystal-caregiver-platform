from rest_framework import serializers
from apps.core.models import State
from .models import Caregiver, CaregiverApplication
from .services import caregiver_credential_status, submit_caregiver_application

class CaregiverProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="id.email", read_only=True)
    state_code = serializers.CharField(source="state.code", read_only=True)
    application_id = serializers.SerializerMethodField(read_only=True)
    application_status = serializers.SerializerMethodField(read_only=True)
    application_submitted_at = serializers.SerializerMethodField(read_only=True)
    compliance = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Caregiver
        fields = [
            "id", "email", "state", "state_code", "application_id",
            "application_status", "application_submitted_at", "compliance",
            "first_name", "last_name", "phone", "address",
            "date_of_birth", "ssn_last4", "legal_hold",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "email", "state", "legal_hold", "created_at", "updated_at"]

    def _latest_application(self, obj):
        if not hasattr(obj, "_latest_application"):
            obj._latest_application = (
                CaregiverApplication.objects.filter(caregiver=obj, deleted_at__isnull=True)
                .order_by("-submitted_at", "-created_at")
                .first()
            )
        return obj._latest_application

    def get_application_id(self, obj):
        app = self._latest_application(obj)
        return app.id if app else None

    def get_application_status(self, obj):
        app = self._latest_application(obj)
        return app.status if app else None

    def get_application_submitted_at(self, obj):
        app = self._latest_application(obj)
        return app.submitted_at.isoformat() if app else None

    def get_compliance(self, obj):
        result = caregiver_credential_status(obj)
        return {"is_compliant": result["compliant"], "blocking_reasons": result["missing_requirements"]}

class CaregiverApplicationSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="caregiver.first_name", read_only=True)
    last_name = serializers.CharField(source="caregiver.last_name", read_only=True)
    state_code = serializers.CharField(source="state.code", read_only=True)

    class Meta:
        model = CaregiverApplication
        fields = [
            "id", "caregiver_id", "first_name", "last_name", "state_id", "state_code",
            "status", "submitted_at", "reviewed_at", "notes", "rejection_reason",
            "signature_data", "signed_name", "signed_at", "version", "content_hash"
        ]
        read_only_fields = [
            "id", "submitted_at", "reviewed_at", "content_hash"
        ]

class CaregiverApplyPublicSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8)
    state_id = serializers.IntegerField()
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    ssn_last4 = serializers.CharField(max_length=4, required=False, allow_blank=True, allow_null=True)
    signature_data = serializers.CharField()
    signed_name = serializers.CharField(max_length=200)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_state_id(self, value):
        if not State.objects.filter(pk=value, active=True).exists():
            raise serializers.ValidationError("Select an active operating state.")
        return value

    def save(self):
        return submit_caregiver_application(self.validated_data, request=self.context.get("request"))


class CaregiverApplicationResubmitSerializer(serializers.Serializer):
    state_id = serializers.IntegerField(required=False)
    first_name = serializers.CharField(max_length=100, required=False)
    last_name = serializers.CharField(max_length=100, required=False)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    ssn_last4 = serializers.CharField(max_length=4, required=False, allow_blank=True, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    signature_data = serializers.CharField()
    signed_name = serializers.CharField(max_length=200, required=False)
