"""Schema-only liveness response; no environment or database details are exposed."""

from drf_spectacular.utils import inline_serializer
from rest_framework import serializers


# Keep the existing inline schema's name and fields outside the HTTP handler.
HealthOutput = inline_serializer(name="HealthOutput", fields={"status": serializers.CharField()})
