"""Public branch directory representation."""

from rest_framework import serializers
from apps.operations.models import StateBranch


# Represent the public branch directory without exposing internal identifiers.
class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = StateBranch
        fields = ["public_id", "state_code", "display_name"]
