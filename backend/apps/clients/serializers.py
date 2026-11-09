from rest_framework import serializers

from .models import Client, ClientReferral, ClientAgreement


class ClientSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="id.email", read_only=True)
    state_code = serializers.CharField(source="state.code", read_only=True)

    class Meta:
        model = Client
        fields = [
            "id",
            "email",
            "state_id",
            "state_code",
            "first_name",
            "last_name",
            "date_of_birth",
            "phone",
            "address",
            "medicaid_number",
            "status",
            "service_start_date",
            "admitted_at",
            "admission_notes",
            "rejection_reason",
            "signed_name",
            "signed_at",
            "legal_hold",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "status",
            "service_start_date",
            "admitted_at",
            "admission_notes",
            "legal_hold",
            "created_at",
            "updated_at",
        ]


class CaregiverAssignedClientSerializer(serializers.ModelSerializer):
    """
    HIPAA Minimum Necessary client serializer for assigned caregivers.
    Explicitly excludes Medicaid numbers, admission notes, and
    administrative fields.
    """

    state_code = serializers.CharField(source="state.code", read_only=True)

    class Meta:
        model = Client
        fields = [
            "id",
            "state_id",
            "state_code",
            "first_name",
            "last_name",
            "phone",
            "address",
            "status",
            "service_start_date",
        ]
        read_only_fields = fields


class ClientIntakeSerializer(serializers.Serializer):

    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    date_of_birth = serializers.DateField()
    phone = serializers.CharField(
        max_length=20, required=False, allow_blank=True
    )
    address = serializers.CharField(required=False, allow_blank=True)
    medicaid_number = serializers.CharField(
        max_length=50, required=False, allow_blank=True
    )
    signature_data = serializers.CharField()
    signed_name = serializers.CharField(max_length=200)


class ClientReferralSerializer(serializers.ModelSerializer):
    state_code = serializers.CharField(source="state.code", read_only=True)

    class Meta:
        model = ClientReferral
        fields = [
            "id",
            "state_id",
            "state_code",
            "first_name",
            "last_name",
            "phone",
            "email",
            "referral_source",
            "notes",
            "status",
            "assigned_to",
            "handled_notes",
            "converted_client",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ClientAgreementSerializer(serializers.ModelSerializer):
    signed = serializers.SerializerMethodField()

    class Meta:
        model = ClientAgreement
        fields = [
            "id",
            "client_id",
            "state_id",
            "agreement_key",
            "title",
            "version",
            "body",
            "signed_name",
            "signed_at",
            "content_hash",
            "created_at",
            "signed",
        ]
        read_only_fields = ["id", "content_hash", "created_at", "signed"]

    def get_signed(self, obj):
        return bool(obj.signed_at)


class SignAgreementSerializer(serializers.Serializer):
    signature_data = serializers.CharField()
    signed_name = serializers.CharField(max_length=200)
