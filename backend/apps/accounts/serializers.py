from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from apps.operations.models import StateBranch
from .models import User


# Represent the public branch directory without exposing internal identifiers.
class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = StateBranch
        fields = ["public_id", "state_code", "display_name"]


class StrictSerializer(serializers.Serializer):
    def to_internal_value(self, data):
        unknown = set(data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError({key: "Unsupported field." for key in unknown})
        return super().to_internal_value(data)


class LoginInput(StrictSerializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class PasswordInput(StrictSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_password(self, value):
        try:
            validate_password(value, User(email=self.initial_data.get("email", "")))
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return value


class InvitationInput(StrictSerializer):
    email = serializers.EmailField()
    branch = serializers.UUIDField()
    role = serializers.ChoiceField(choices=["client", "administrator"])


class AcceptInput(PasswordInput):
    token = serializers.CharField()
    name = serializers.CharField(max_length=200)


class ResetRequestInput(StrictSerializer):
    email = serializers.EmailField()


class ResetConfirmInput(PasswordInput):
    uid = serializers.CharField()
    token = serializers.CharField()
