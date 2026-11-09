from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from .models import User


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


class ApplicationInput(PasswordInput):
    name = serializers.CharField(max_length=200)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)
    demo_acknowledged = serializers.BooleanField()

    def validate_demo_acknowledged(self, value):
        if not value:
            raise serializers.ValidationError("Use synthetic data only and acknowledge the demo.")
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.is_authenticated and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Required for a new account."})
        return attrs


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
