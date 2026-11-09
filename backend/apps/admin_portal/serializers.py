from rest_framework import serializers

from apps.clients.models import Client


class ActionTextField(serializers.CharField):
    """Accept text without coercing JSON numbers into workflow notes."""

    def __init__(self, **kwargs):
        super().__init__(trim_whitespace=False, **kwargs)

    def to_internal_value(self, data):
        if not isinstance(data, str):
            self.fail("invalid")
        return super().to_internal_value(data)


class ClientAdmissionActionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=Client.STATUS_CHOICES,
        default="approved",
    )
    service_start_date = serializers.DateField(allow_null=True, default=None)
    admission_notes = ActionTextField(
        allow_blank=True,
        allow_null=True,
        default="",
    )
    rejection_reason = ActionTextField(
        allow_blank=True,
        allow_null=True,
        default="",
    )


class CaregiverApplicationReviewActionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=("approved", "rejected", "under_review", "onboarding"),
    )
    notes = ActionTextField(allow_blank=True, default="")
    rejection_reason = ActionTextField(
        allow_blank=True,
        allow_null=True,
        default=None,
    )
