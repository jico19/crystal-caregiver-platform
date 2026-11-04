from rest_framework import serializers
from .models import DocumentType, DocumentRequirement, Document

class DocumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentType
        fields = ["id", "name", "for_role", "requires_expiration", "description", "created_at"]

class DocumentTypeBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentType
        fields = ["id", "name", "requires_expiration"]

class DocumentRequirementSerializer(serializers.ModelSerializer):
    document_type_name = serializers.CharField(source="document_type.name", read_only=True)
    state_code = serializers.CharField(source="state.code", read_only=True)

    class Meta:
        model = DocumentRequirement
        fields = ["id", "state_id", "state_code", "document_type_id", "document_type_name", "for_role", "required"]

class DocumentSerializer(serializers.ModelSerializer):
    document_type_name = serializers.CharField(source="document_type.name", read_only=True)
    owner_email = serializers.EmailField(source="owner.email", read_only=True)

    class Meta:
        model = Document
        fields = [
            "id", "owner_id", "owner_email", "document_type_id", "document_type_name",
            "state_id", "storage_path", "status", "expiration_date", "reviewed_at",
            "rejection_reason", "legal_hold", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "storage_path", "reviewed_at", "created_at", "updated_at"]

class DocumentMeSerializer(serializers.ModelSerializer):
    document_types = DocumentTypeBriefSerializer(source="document_type", read_only=True)
    uploaded_at = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Document
        fields = [
            "id", "document_types", "status", "expiration_date",
            "uploaded_at", "rejection_reason",
        ]
        read_only_fields = fields

class UploadIntentSerializer(serializers.Serializer):
    document_type_id = serializers.IntegerField()
    filename = serializers.CharField(max_length=255)
    content_type = serializers.CharField(max_length=100, default="application/pdf")
    expiration_date = serializers.DateField(required=False, allow_null=True)

class DocumentReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["approved", "rejected"])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
