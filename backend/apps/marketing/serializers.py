from rest_framework import serializers
from apps.core.models import State
from .models import WebsiteContent, Service, Form, LicensingInfo, JobPosting

class StateSerializer(serializers.ModelSerializer):
    class Meta:
        model = State
        fields = ["id", "code", "name", "slug", "active"]

class WebsiteContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsiteContent
        fields = ["id", "section_key", "title", "content", "metadata", "created_at", "updated_at"]

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ["id", "title", "description", "icon_name", "sort_order", "active"]

class FormSerializer(serializers.ModelSerializer):
    class Meta:
        model = Form
        fields = ["id", "title", "description", "file_path", "file_size_bytes", "category", "created_at"]

class LicensingInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = LicensingInfo
        fields = ["id", "license_number", "issuing_authority", "status", "verified_at", "disclosures"]

class JobPostingSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobPosting
        fields = [
            "id", "title", "department", "employment_type",
            "description", "requirements", "compensation", "active", "created_at"
        ]

class ContactInquirySerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField(required=False, allow_blank=True)
    referral_source = serializers.CharField(max_length=100, default="Website")
    notes = serializers.CharField(required=False, allow_blank=True)
