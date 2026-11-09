from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authorizations.models import Authorization
from apps.authorizations.serializers import (
    AuthorizationCreateSerializer,
    AuthorizationSerializer,
)
from apps.care.models import CarePlan, CareSchedule
from apps.care.serializers import CarePlanSerializer, CareScheduleSerializer
from apps.core.permissions import IsClient

from .models import Client
from .serializers import (
    ClientSerializer,
    ClientIntakeSerializer,
    ClientAgreementSerializer,
    SignAgreementSerializer,
)
from .services import (
    submit_client_intake,
    sign_client_agreement,
    list_latest_client_agreements,
)


class ClientMeView(APIView):
    """
    GET /api/v1/clients/me - Returns demographic profile for
    authenticated client.
    """

    permission_classes = [IsClient]

    def get(self, request):
        client = get_object_or_404(Client, id=request.user)
        return Response(ClientSerializer(client).data)

    def patch(self, request):
        client = get_object_or_404(Client, id=request.user)
        serializer = ClientSerializer(client, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ClientIntakeView(APIView):
    """
    POST /api/v1/clients/intake - Submits digital intake packet and
    consent signature.
    """

    permission_classes = [IsClient]

    def post(self, request):
        serializer = ClientIntakeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        client, created = submit_client_intake(
            owner=request.user,
            validated_data=serializer.validated_data,
        )
        return Response(
            ClientSerializer(client).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ClientAgreementsListView(APIView):
    """
    GET /api/v1/clients/me/agreements - Lists agreements on file for the
    client (deduplicated by key).
    """

    permission_classes = [IsClient]

    def get(self, request):
        agreements = list_latest_client_agreements(owner=request.user)
        return Response(ClientAgreementSerializer(agreements, many=True).data)


class ClientAgreementSignView(APIView):
    """
    POST /api/v1/clients/me/agreements/{key}/sign - Digitally signs
    legal agreement.
    """

    permission_classes = [IsClient]

    def post(self, request, key):
        serializer = SignAgreementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        client = get_object_or_404(Client, id=request.user)
        agreement = sign_client_agreement(
            client=client,
            key=key,
            validated_data=serializer.validated_data,
        )
        return Response(
            ClientAgreementSerializer(agreement).data,
            status=status.HTTP_201_CREATED,
        )


class ClientAuthorizationsView(APIView):
    """
    GET /api/v1/clients/me/authorizations, POST
    /api/v1/clients/me/authorizations
    """

    permission_classes = [IsClient]

    def get(self, request):

        auths = Authorization.objects.filter(
            client_id=request.user.id, deleted_at__isnull=True
        )
        return Response(AuthorizationSerializer(auths, many=True).data)

    def post(self, request):

        serializer = AuthorizationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        client = get_object_or_404(Client, id=request.user)
        auth = serializer.save(
            client=client, state=client.state, source="client"
        )
        return Response(
            AuthorizationSerializer(auth).data, status=status.HTTP_201_CREATED
        )


class ClientCarePlanView(APIView):
    """GET /api/v1/clients/me/care-plan"""

    permission_classes = [IsClient]

    def get(self, request):

        plan = CarePlan.objects.filter(
            client_id=request.user.id, deleted_at__isnull=True
        ).first()
        if not plan:
            return Response({"care_plan": None}, status=status.HTTP_200_OK)
        return Response(
            {"care_plan": CarePlanSerializer(plan).data},
            status=status.HTTP_200_OK,
        )


class ClientScheduleView(APIView):
    """GET /api/v1/clients/me/schedule"""

    permission_classes = [IsClient]

    def get(self, request):

        schedules = CareSchedule.objects.filter(
            client_id=request.user.id, deleted_at__isnull=True
        )
        return Response(CareScheduleSerializer(schedules, many=True).data)
