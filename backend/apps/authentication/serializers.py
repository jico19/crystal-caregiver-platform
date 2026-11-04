from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.db import transaction
from apps.core.models import Role, State

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom SimpleJWT serializer providing user metadata in token and response."""
    username_field = User.USERNAME_FIELD

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["user_id"] = str(user.id)
        token["role"] = user.role.name if user.role else None
        token["state_id"] = user.state_id
        token["email"] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        if user.status != "active" or user.deleted_at is not None:
            raise serializers.ValidationError(
                {"detail": "User account is suspended or inactive."}
            )

        data["user_id"] = str(user.id)
        data["role"] = user.role.name if user.role else None
        data["state_id"] = user.state_id
        return data

class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="role.name", read_only=True)
    state_id = serializers.IntegerField(source="state.id", read_only=True, allow_null=True)

    class Meta:
        model = User
        fields = ["id", "email", "role", "state_id", "status", "created_at"]
        read_only_fields = ["id", "created_at"]

class UserRegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=("caregiver", "client"), default="caregiver")
    state_id = serializers.IntegerField(required=False, allow_null=True)
    first_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)

    def validate_email(self, value):
        norm_email = value.lower()
        if User.objects.filter(email__iexact=norm_email).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return norm_email

    def validate(self, attrs):
        state_id = attrs.get("state_id")
        if attrs["role"] == "caregiver" and state_id is None:
            raise serializers.ValidationError({"state_id": "Select an active operating state."})
        if state_id is not None:
            states = State.objects.filter(pk=state_id)
            if attrs["role"] == "caregiver":
                states = states.filter(active=True)
            if not states.exists():
                raise serializers.ValidationError({"state_id": "Select a valid operating state."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data["email"]
        password = validated_data["password"]
        role_name = validated_data.get("role", "caregiver")
        state_id = validated_data.get("state_id")

        role, _ = Role.objects.get_or_create(
            name=role_name,
            defaults={"description": f"Role for {role_name}"}
        )

        state = None
        if state_id:
            try:
                state = State.objects.get(id=state_id)
            except State.DoesNotExist:
                raise serializers.ValidationError({"state_id": "Invalid state ID provided."})

        user = User.objects.create_user(
            email=email,
            password=password,
            role=role,
            state=state,
            status="active",
        )
        if role_name == "caregiver":
            from apps.caregivers.models import Caregiver

            Caregiver.objects.create(
                id=user,
                state=state,
                first_name=validated_data.get("first_name", ""),
                last_name=validated_data.get("last_name", ""),
                phone=validated_data.get("phone"),
            )
        return user
