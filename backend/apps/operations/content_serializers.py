"""Represent published illustrative branch content for public pages."""

from rest_framework import serializers
from .models import BranchContent


# Expose public copy fields; publication and active-branch filtering stay in the view.
class BranchContentSerializer(serializers.ModelSerializer):
    state_code = serializers.CharField(source="branch.state_code", read_only=True)

    class Meta:
        model = BranchContent
        fields = ["public_id", "state_code", "content_key", "title", "body"]
