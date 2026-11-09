from rest_framework import serializers

from .models import Caregiver, CaregiverApplication
from .services import ApplicationEmailConflict, submit_caregiver_application


class CaregiverProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="id.email", read_only=True)
    state_code = serializers.CharField(source="state.code", read_only=True)
    application_id = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Caregiver
        fields = [
            "id",
            "email",
            "state",
            "state_code",
            "application_id",
            "first_name",
            "last_name",
            "phone",
            "address",
            "date_of_birth",
            "ssn_last4",
            "legal_hold",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "state",
            "legal_hold",
            "created_at",
            "updated_at",
        ]

    def get_application_id(self, obj):
        app = (
            CaregiverApplication.objects.filter(
                caregiver=obj,
                deleted_at__isnull=True,
            )
            .order_by("-submitted_at", "-created_at")
            .first()
        )
        return app.id if app else None


class CaregiverApplicationSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(
        source="caregiver.first_name", read_only=True
    )
    last_name = serializers.CharField(
        source="caregiver.last_name", read_only=True
    )
    state_code = serializers.CharField(source="state.code", read_only=True)

    class Meta:
        model = CaregiverApplication
        fields = [
            "id",
            "caregiver_id",
            "first_name",
            "last_name",
            "state_id",
            "state_code",
            "status",
            "submitted_at",
            "reviewed_at",
            "notes",
            "rejection_reason",
            "signature_data",
            "signed_name",
            "signed_at",
            "version",
            "content_hash",
        ]
        read_only_fields = [
            "id",
            "submitted_at",
            "reviewed_at",
            "content_hash",
        ]


class CaregiverApplyPublicSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    state_id = serializers.IntegerField()
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone = serializers.CharField(
        max_length=20, required=False, allow_blank=True
    )
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    ssn_last4 = serializers.CharField(
        max_length=4, required=False, allow_blank=True
    )
    signature_data = serializers.CharField()
    signed_name = serializers.CharField(max_length=200)

    def create(self, validated_data):
        try:
            return submit_caregiver_application(validated_data)
        except ApplicationEmailConflict as error:
            raise serializers.ValidationError(
                {
                    "email": [
                        "Unable to create an application with this email."
                    ],
                }
            ) from error
