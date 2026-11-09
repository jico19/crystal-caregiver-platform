"""Strict inputs for application transitions, document review, and demo completion."""

from rest_framework import serializers
from apps.accounts.serializers.inputs import StrictSerializer


# Validate expected application status and review fields before service-level transition checks.
class TransitionInput(StrictSerializer):
    expected_status = serializers.ChoiceField(choices=["submitted", "under_review", "approved", "rejected"])
    new_status = serializers.ChoiceField(choices=["under_review", "approved", "rejected"])
    comment = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")


# Validate the expected pending version, decision and reviewer comment.
class ReviewInput(StrictSerializer):
    expected_status = serializers.ChoiceField(choices=["pending"])
    decision = serializers.ChoiceField(choices=["approved", "rejected"])
    comment = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")


# Require expected demo onboarding status before readiness is checked by the service.
class CompletionInput(StrictSerializer):
    expected_status = serializers.ChoiceField(choices=["onboarding"])
