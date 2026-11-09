"""Directory representations for already authorized caregiver and client records."""

from rest_framework import serializers
from .models import Caregiver, Client


# Shared directory fields are serialized only after the view scopes the records.
class PersonSerializer(serializers.ModelSerializer):
    state_code = serializers.CharField(source="branch.state_code", read_only=True)

    class Meta:
        model = Caregiver
        fields = ["public_id", "name", "state_code", "active"]


# Reuse the directory contract while selecting the client model explicitly.
class ClientSerializer(PersonSerializer):
    class Meta(PersonSerializer.Meta):
        model = Client
