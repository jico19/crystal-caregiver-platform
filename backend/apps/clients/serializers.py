import hashlib
import json
from rest_framework import serializers
from .models import Client, ClientReferral, ClientAgreement

class ClientSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="id.email", read_only=True)
    state_code = serializers.CharField(source="state.code", read_only=True)

    class Meta:
        model = Client
        fields = [
            "id", "email", "state_id", "state_code", "first_name", "last_name",
            "date_of_birth", "phone", "address", "medicaid_number",
            "status", "service_start_date", "admitted_at", "admission_notes",
            "rejection_reason", "signed_name", "signed_at", "legal_hold",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "email", "status", "service_start_date",
            "admitted_at", "admission_notes", "legal_hold", "created_at", "updated_at"
        ]

class CaregiverAssignedClientSerializer(serializers.ModelSerializer):
    """
    HIPAA Minimum Necessary client serializer for assigned caregivers.
    Explicitly excludes Medicaid numbers, admission notes, and administrative fields.
    """
    state_code = serializers.CharField(source="state.code", read_only=True)

    class Meta:
        model = Client
        fields = [
            "id", "state_id", "state_code", "first_name", "last_name",
            "phone", "address", "status", "service_start_date",
        ]
        read_only_fields = fields

class ClientIntakeSerializer(serializers.Serializer):

    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    date_of_birth = serializers.DateField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    medicaid_number = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    signature_data = serializers.CharField()
    signed_name = serializers.CharField(max_length=200)

class ClientReferralSerializer(serializers.ModelSerializer):
    state_code = serializers.CharField(source="state.code", read_only=True)

    class Meta:
        model = ClientReferral
        fields = [
            "id", "state_id", "state_code", "first_name", "last_name", "phone",
            "email", "referral_source", "notes", "status", "assigned_to",
            "handled_notes", "converted_client", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

class ClientAgreementSerializer(serializers.ModelSerializer):
    signed = serializers.SerializerMethodField()
    signed_at = serializers.SerializerMethodField()
    terms_hash = serializers.SerializerMethodField()

    class Meta:
        model = ClientAgreement
        fields = [
            "id", "client_id", "state_id", "agreement_key", "title",
            "version", "body", "signed_name", "signed_at", "content_hash", "created_at",
            "signed", "terms_hash",
        ]
        read_only_fields = ["id", "content_hash", "created_at", "signed"]

    def get_signed(self, obj):
        return bool(obj.signed_at and obj.signature_data and obj.signed_name and obj.content_hash)

    def get_signed_at(self, obj):
        return obj.signed_at.isoformat() if self.get_signed(obj) else None

    def get_terms_hash(self, obj):
        return agreement_terms_hash(obj)


def agreement_terms_payload(agreement):
    """The exact agency form revision presented to a client for signature."""
    return {
        "agreement_id": str(agreement.id), "agreement_key": agreement.agreement_key,
        "client_id": str(agreement.client_id), "state_id": agreement.state_id,
        "title": agreement.title, "version": agreement.version, "body": agreement.body,
    }


def agreement_terms_hash(agreement):
    canonical = json.dumps(agreement_terms_payload(agreement), sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

class SignAgreementSerializer(serializers.Serializer):
    agreement_id = serializers.UUIDField()
    terms_hash = serializers.RegexField(regex=r"^[a-f0-9]{64}$")
    signature_data = serializers.CharField()
    signed_name = serializers.CharField(max_length=200)
