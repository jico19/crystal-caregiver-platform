from rest_framework import serializers
from apps.accounts.serializers import StrictSerializer


class TransitionInput(StrictSerializer):
    expected_status = serializers.ChoiceField(choices=["submitted", "under_review", "approved", "rejected"])
    new_status = serializers.ChoiceField(choices=["under_review", "approved", "rejected"])
    comment = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")


class ReviewInput(StrictSerializer):
    expected_status = serializers.ChoiceField(choices=["pending"])
    decision = serializers.ChoiceField(choices=["approved", "rejected"])
    comment = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")


class CompletionInput(StrictSerializer):
    expected_status = serializers.ChoiceField(choices=["onboarding"])
