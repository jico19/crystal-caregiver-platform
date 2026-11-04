import hashlib
import json
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from apps.core.permissions import IsClient
from .models import Client, ClientAgreement
from .serializers import (
    ClientSerializer,
    ClientIntakeSerializer,
    ClientAgreementSerializer,
    SignAgreementSerializer,
)

class ClientMeView(APIView):
    """GET /api/v1/clients/me - Returns demographic profile for authenticated client."""
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
    """POST /api/v1/clients/intake - Submits digital intake packet and consent signature."""
    permission_classes = [IsClient]

    def post(self, request):
        serializer = ClientIntakeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        client, created = Client.objects.update_or_create(
            id=request.user,
            defaults={
                "state": request.user.state,
                "first_name": data["first_name"],
                "last_name": data["last_name"],
                "date_of_birth": data["date_of_birth"],
                "phone": data.get("phone", ""),
                "address": data.get("address", ""),
                "medicaid_number": data.get("medicaid_number", ""),
                "signature_data": data["signature_data"],
                "signed_name": data["signed_name"],
                "signed_at": timezone.now(),
                "status": "pending",
            }
        )
        return Response(ClientSerializer(client).data, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)

STATUTORY_AGREEMENT_TITLES = {
    "general_care_terms_v1": "Home Health Services Agreement & Patient Bill of Rights",
    "care_agreement": "Home Care Agreement & Terms of Service",
    "hipaa_disclosure": "HIPAA Privacy Notice & Health Data Disclosure",
    "client_rights": "Client Rights & Responsibilities Notice",
    "advance_directives": "Advance Directives & Healthcare Proxy Acknowledgement",
}

class ClientAgreementsListView(APIView):
    """GET /api/v1/clients/me/agreements - Lists agreements on file for the client (deduplicated by key)."""
    permission_classes = [IsClient]

    def get(self, request):
        raw_agreements = ClientAgreement.objects.filter(client=request.user).order_by("-created_at")
        seen_keys = set()
        deduped = []
        for ag in raw_agreements:
            if ag.agreement_key not in seen_keys:
                seen_keys.add(ag.agreement_key)
                deduped.append(ag)
        return Response(ClientAgreementSerializer(deduped, many=True).data)

class ClientAgreementSignView(APIView):
    """POST /api/v1/clients/me/agreements/{key}/sign - Digitally signs legal agreement."""
    permission_classes = [IsClient]

    def post(self, request, key):
        serializer = SignAgreementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        client = get_object_or_404(Client, id=request.user)
        signed_at = timezone.now()
        signed_name = data["signed_name"]

        # Calculate SHA256 content hash
        body = f"Standard statutory {key} agreement terms for {client.state.name} jurisdiction."
        payload_to_hash = {
            "agreement_key": key,
            "client_id": str(request.user.id),
            "state_id": client.state.id,
            "body": body,
        }
        canonical_json = json.dumps(payload_to_hash, sort_keys=True, separators=(',', ':'))
        hash_input = f"{canonical_json}{signed_name}{signed_at.isoformat()}".encode("utf-8")
        content_hash = hashlib.sha256(hash_input).hexdigest()

        # Determine authoritative title and next version
        existing = ClientAgreement.objects.filter(client=request.user, agreement_key=key).order_by("-version").first()
        if existing and existing.title and existing.title != "General Care Terms V1":
            title = existing.title
            next_version = (existing.version or 1) + 1
        elif key in STATUTORY_AGREEMENT_TITLES:
            title = f"{client.state.code} {STATUTORY_AGREEMENT_TITLES[key]}"
            next_version = (existing.version + 1) if existing else 1
        else:
            title = key.replace("_", " ").title()
            next_version = (existing.version + 1) if existing else 1

        agreement = ClientAgreement.objects.create(
            client=request.user,
            state=client.state,
            agreement_key=key,
            title=title,
            version=next_version,
            body=body,
            signature_data=data["signature_data"],
            signed_name=signed_name,
            signed_at=signed_at,
            content_hash=content_hash,
        )
        return Response(ClientAgreementSerializer(agreement).data, status=status.HTTP_201_CREATED)

class ClientAuthorizationsView(APIView):
    """GET /api/v1/clients/me/authorizations, POST /api/v1/clients/me/authorizations"""
    permission_classes = [IsClient]

    def get(self, request):
        from apps.authorizations.models import Authorization
        from apps.authorizations.serializers import AuthorizationSerializer
        auths = Authorization.objects.filter(client_id=request.user.id, deleted_at__isnull=True)
        return Response(AuthorizationSerializer(auths, many=True).data)

    def post(self, request):
        from apps.authorizations.models import Authorization
        from apps.authorizations.serializers import AuthorizationCreateSerializer, AuthorizationSerializer
        serializer = AuthorizationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        client = get_object_or_404(Client, id=request.user)
        auth = serializer.save(client=client, state=client.state, source="client")
        return Response(AuthorizationSerializer(auth).data, status=status.HTTP_201_CREATED)

class ClientCarePlanView(APIView):
    """GET /api/v1/clients/me/care-plan"""
    permission_classes = [IsClient]

    def get(self, request):
        from apps.care.models import CarePlan
        from apps.care.serializers import CarePlanSerializer
        plan = CarePlan.objects.filter(client_id=request.user.id, deleted_at__isnull=True).first()
        if not plan:
            return Response({"care_plan": None}, status=status.HTTP_200_OK)
        return Response({"care_plan": CarePlanSerializer(plan).data}, status=status.HTTP_200_OK)

class ClientScheduleView(APIView):
    """GET /api/v1/clients/me/schedule"""
    permission_classes = [IsClient]

    def get(self, request):
        from apps.care.models import CareSchedule
        from apps.care.serializers import CareScheduleSerializer
        schedules = CareSchedule.objects.filter(client_id=request.user.id, deleted_at__isnull=True)
        return Response(CareScheduleSerializer(schedules, many=True).data)
