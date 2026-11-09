"""Strict account inputs and reusable Django password validation."""

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from ..models import User


# Reject unsupported fields instead of silently ignoring client-supplied keys.
class StrictSerializer(serializers.Serializer):
    # Reject unknown keys before DRF validates the declared fields.
    def to_internal_value(self, data):
        unknown = set(data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError({key: "Unsupported field." for key in unknown})
        return super().to_internal_value(data)


# Validate credentials while preserving password whitespace.
class LoginInput(StrictSerializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)


# Share configured Django password validation across account inputs.
class PasswordInput(StrictSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    # Validate against a temporary user identity and translate Django validation errors.
    def validate_password(self, value):
        try:
            validate_password(value, User(email=self.initial_data.get("email", "")))
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return value


# Validate invitation fields; the service authorizes the branch and role.
class InvitationInput(StrictSerializer):
    email = serializers.EmailField()
    branch = serializers.UUIDField()
    role = serializers.ChoiceField(choices=["client", "administrator"])


# Validate the invitation token and proposed account details before acceptance.
class AcceptInput(PasswordInput):
    token = serializers.CharField()
    name = serializers.CharField(max_length=200)


# Accept an email for the generic reset-request workflow.
class ResetRequestInput(StrictSerializer):
    email = serializers.EmailField()


# Require the encoded account, token, and validated replacement password.
class ResetConfirmInput(PasswordInput):
    uid = serializers.CharField()
    token = serializers.CharField()
