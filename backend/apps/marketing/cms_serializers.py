"""Explicitly public fields accepted by the website editor."""
import uuid
from rest_framework import serializers


class OverviewSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(max_length=10000, allow_blank=True)


class ContactSerializer(serializers.Serializer):
    phone = serializers.RegexField(r"^[0-9+(). x-]*$", max_length=50, allow_blank=True)
    email = serializers.EmailField(allow_blank=True)
    address = serializers.CharField(max_length=1000, allow_blank=True)
    office_hours = serializers.CharField(max_length=500, allow_blank=True)


class ServiceSerializer(serializers.Serializer):
    id = serializers.UUIDField(default=uuid.uuid4)
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(max_length=5000, allow_blank=True, default="")


class LicenseSerializer(serializers.Serializer):
    id = serializers.UUIDField(default=uuid.uuid4)
    license_number = serializers.CharField(max_length=100)
    issuing_authority = serializers.CharField(max_length=200)
    status = serializers.CharField(max_length=50, allow_blank=True, default="")
    disclosures = serializers.CharField(max_length=5000, allow_blank=True, default="")


class CareerSerializer(ServiceSerializer):
    department = serializers.CharField(max_length=100, allow_blank=True, default="")
    employment_type = serializers.CharField(max_length=50, allow_blank=True, default="")
    requirements = serializers.CharField(max_length=5000, allow_blank=True, default="")
    compensation = serializers.CharField(max_length=100, allow_blank=True, default="")


class FormSerializer(ServiceSerializer):
    category = serializers.ChoiceField(choices=("general", "employment_packet", "admission_packet"), default="general")
    asset_key = serializers.RegexField(r"^[a-f0-9]{64}\.pdf$", allow_blank=True, default="")
    filename = serializers.CharField(max_length=255, allow_blank=True, default="")


class WebsiteDraftSerializer(serializers.Serializer):
    overview = OverviewSerializer()
    contact = ContactSerializer()
    services = ServiceSerializer(many=True, max_length=100)
    licensing = LicenseSerializer(many=True, max_length=100)
    careers = CareerSerializer(many=True, max_length=100)
    forms = FormSerializer(many=True, max_length=100)


class SaveDraftSerializer(serializers.Serializer):
    revision = serializers.RegexField(r"^[a-f0-9]{64}$")
    draft = WebsiteDraftSerializer()


class PublishSerializer(serializers.Serializer):
    revision = serializers.RegexField(r"^[a-f0-9]{64}$")
