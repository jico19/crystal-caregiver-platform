from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.settings import api_settings
from apps.compliance.audit import record_audit_log
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    UserRegisterSerializer,
)

class CustomTokenObtainPairView(TokenObtainPairView):
    """Issues JWT access and refresh token pair with state and role claims."""
    serializer_class = CustomTokenObtainPairSerializer
    throttle_scope = "auth_login"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as error:
            raise InvalidToken(error.args[0]) from error
        user = serializer.user
        record_audit_log(
            action="LOGIN", table_name="users", record_id=user.pk,
            request=request, user=user, entity_state=user.state,
        )
        return Response(serializer.validated_data, status=status.HTTP_200_OK)

class RegisterView(APIView):
    """Registers a new user account with hashed password and role assignment."""
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_register"


    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        record_audit_log(
            action="REGISTER", table_name="users", record_id=user.pk,
            request=request, user=user, entity_state=user.state,
            new_values={"status": user.status, "role_id": user.role_id, "state_id": user.state_id},
        )
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )

class LogoutView(APIView):
    """Blacklists the provided refresh token upon user logout."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            if str(token.get(api_settings.USER_ID_CLAIM)) != str(request.user.pk):
                return Response(
                    {"detail": "This refresh token does not belong to your account."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            token.blacklist()
            record_audit_log(
                action="LOGOUT", table_name="users", record_id=request.user.pk,
                request=request, entity_state=request.user.state,
            )
            return Response(
                {"message": "Logged out successfully."},
                status=status.HTTP_200_OK,
            )
        except TokenError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

class MeView(APIView):
    """Returns authenticated user profile, active role, and state scope."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
