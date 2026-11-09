"""Public job representations and their published application form schema."""

from rest_framework import serializers
from .models import JobPosting
from .application_serializers import FormVersionSerializer


# Keep public listing fields separate from HTTP routing and query scoping.
class JobSerializer(serializers.ModelSerializer):
    state_code = serializers.CharField(source="branch.state_code", read_only=True)

    class Meta:
        model = JobPosting
        fields = ["public_id", "title", "description", "state_code"]


# Details include the exact form version published with this opportunity.
class JobDetailSerializer(JobSerializer):
    application_form = FormVersionSerializer(source="form_version")

    class Meta(JobSerializer.Meta):
        fields = JobSerializer.Meta.fields + ["application_form"]
