"""Response contract for demo onboarding snapshots and the staff queue."""

from rest_framework import serializers


# Describe service-produced snapshots without moving readiness rules into serializers.
class OnboardingOutput(serializers.Serializer):
    caregiver = serializers.UUIDField()
    name = serializers.CharField()
    state_code = serializers.CharField()
    status = serializers.CharField()
    ready_to_complete = serializers.BooleanField()
    application_approved = serializers.BooleanField()
    requirements = serializers.ListField(child=serializers.DictField())
    counts = serializers.DictField(child=serializers.IntegerField())
    history = serializers.ListField(child=serializers.DictField())
    allowed_actions = serializers.DictField(child=serializers.BooleanField())
