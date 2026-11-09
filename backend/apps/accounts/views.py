import uuid
from drf_spectacular.utils import extend_schema
from .contracts import SessionOutput, CSRFOutput, AuthOutput, DetailOutput, InvitationOutput
from django.db.models import Q
from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.operations.models import StateBranch, AgencyAdmin, BranchStaff, Caregiver, Client
from .access import admin_branches
from .permissions import IsBusinessAdmin
from .serializers import (
    BranchSerializer,
    LoginInput,
    InvitationInput,
    AcceptInput,
    ResetRequestInput,
    ResetConfirmInput,
)
from .services import audit, invite, accept_invitation, request_reset, confirm_reset


def identity(user):
    roles = []
    if AgencyAdmin.objects.filter(user=user, active=True).exists():
        roles.append("super-admin")
    if BranchStaff.objects.filter(
        user=user, active=True, role="administrator", branch__active=True
    ).exists():
        roles.append("state-admin")
    for model, role in [(Caregiver, "caregiver"), (Client, "client")]:
        if model.objects.filter(user=user, active=True, branch__active=True).exists():
            roles.append(role)
    own = StateBranch.objects.filter(active=True).filter(
        Q(caregiver__user=user, caregiver__active=True) | Q(client__user=user, client__active=True)
    )
    branches = (admin_branches(user) | own).distinct().order_by("state_code")
    return {
        "email": user.email,
        "roles": roles,
        "branches": BranchSerializer(branches, many=True).data,
    }


class BranchList(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = BranchSerializer
    queryset = StateBranch.objects.filter(active=True).order_by("state_code")


@method_decorator(csrf_protect, name="dispatch")
class PublicAuthView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def input(self, request, serializer):
        data = serializer(data=request.data)
        data.is_valid(raise_exception=True)
        return data.validated_data


class CSRFView(PublicAuthView):
    @extend_schema(responses=CSRFOutput)
    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class LoginView(PublicAuthView):
    serializer_class = LoginInput

    @extend_schema(responses=AuthOutput)
    def post(self, request):
        data = self.input(request, LoginInput)
        user = authenticate(request, username=data["email"], password=data["password"])
        if not user:
            audit(None, "login.failed", uuid.UUID(int=0))
            raise ValidationError("Invalid email or password.")
        login(request, user)
        audit(user, "login.succeeded", uuid.uuid5(uuid.NAMESPACE_OID, str(user.pk)))
        return Response({"user": identity(user), "csrfToken": get_token(request)})


class LogoutView(APIView):
    @extend_schema(request=None, responses={204: None})
    def post(self, request):
        audit(request.user, "logout", uuid.uuid5(uuid.NAMESPACE_OID, str(request.user.pk)))
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    @extend_schema(responses=SessionOutput)
    def get(self, request):
        return Response(identity(request.user))


class InvitationView(PublicAuthView):
    permission_classes = [IsBusinessAdmin]
    serializer_class = InvitationInput

    @extend_schema(responses={201: InvitationOutput})
    def post(self, request):
        invitation = invite(request.user, self.input(request, InvitationInput))
        return Response({"public_id": str(invitation.public_id), "status": "invited"}, status=201)


class AcceptView(PublicAuthView):
    serializer_class = AcceptInput

    @extend_schema(responses=AuthOutput)
    def post(self, request):
        user = accept_invitation(self.input(request, AcceptInput), request.user)
        login(request, user, backend="apps.accounts.backends.EmailBackend")
        return Response({"user": identity(user), "csrfToken": get_token(request)})


class ResetRequestView(PublicAuthView):
    serializer_class = ResetRequestInput

    @extend_schema(responses=DetailOutput)
    def post(self, request):
        request_reset(self.input(request, ResetRequestInput)["email"])
        return Response(
            {
                "detail": "If an account matches, a reset link has been recorded in the demo email transport."
            }
        )


class ResetConfirmView(PublicAuthView):
    serializer_class = ResetConfirmInput

    @extend_schema(responses=DetailOutput)
    def post(self, request):
        data = self.input(request, ResetConfirmInput)
        # The account service owns token verification, password persistence, and audit.
        confirm_reset(data)
        return Response({"detail": "Password updated. Sign in with your new password."})
