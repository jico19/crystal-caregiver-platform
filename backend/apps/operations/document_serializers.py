from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from apps.accounts.serializers import StrictSerializer
from .models import Document, DocumentVersion, DocumentReview


class UploadInput(StrictSerializer):
    document_type = serializers.SlugField()
    fixture_id = serializers.CharField(max_length=100)
    file = serializers.FileField()
    demo_acknowledged = serializers.BooleanField()
    issued_on = serializers.DateField(required=False)
    expires_on = serializers.DateField(required=False)


class DocumentReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentReview
        fields = ["public_id", "decision", "comment", "reviewed_at"]


class DocumentVersionSerializer(serializers.ModelSerializer):
    reviews = DocumentReviewSerializer(source="documentreview_set", many=True)

    class Meta:
        model = DocumentVersion
        fields = ["public_id", "version_number", "review_status", "issued_on", "expires_on", "submitted_at", "reviews"]


class DocumentSerializer(serializers.ModelSerializer):
    document_type = serializers.CharField(source="document_type.code")
    label = serializers.CharField(source="document_type.label")
    versions = serializers.SerializerMethodField()
    effective_version = serializers.SerializerMethodField()

    @extend_schema_field(DocumentVersionSerializer(many=True))
    def get_versions(self, obj):
        return DocumentVersionSerializer(sorted(obj.documentversion_set.all(), key=lambda v: v.version_number), many=True).data

    def get_effective_version(self, obj) -> str | None:
        versions = [v for v in obj.documentversion_set.all() if v.review_status == "approved"]
        return str(max(versions, key=lambda v: v.version_number).public_id) if versions else None

    class Meta:
        model = Document
        fields = ["public_id", "document_type", "label", "versions", "effective_version"]
