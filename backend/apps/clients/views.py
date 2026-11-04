import hashlib
import json
from django.db import transaction
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from apps.core.permissions import IsClient
from apps.compliance.audit import record_audit_log
from .models import Client, ClientAgreement
from .serializers import (
    ClientSerializer,
    ClientIntakeSerializer,
    ClientAgreementSerializer,
    SignAgreementSerializer,
    agreement_terms_payload,
    agreement_terms_hash,
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
        record_audit_log(action="UPDATE_CLIENT_PROFILE", table_name="clients", record_id=client.pk,
                         request=request, entity_state=client.state)
        return Response(serializer.data)

class ClientIntakeView(APIView):
    """POST /api/v1/clients/intake - Submits digital intake packet and consent signature."""
    permission_classes = [IsClient]

    def post(self, request):
        serializer = ClientIntakeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if not request.user.state_id:
            return Response({"detail": "Your account must be assigned to a service state before intake."}, status=400)

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
            }
        )
        record_audit_log(action="SUBMIT_CLIENT_INTAKE", table_name="clients", record_id=client.pk,
                         request=request, entity_state=client.state, new_values={"status": client.status})
        return Response(ClientSerializer(client).data, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)

class ClientAgreementsListView(APIView):
    """GET /api/v1/clients/me/agreements - Lists agreements on file for the client (deduplicated by key)."""
    permission_classes = [IsClient]

    def get(self, request):
        raw_agreements = ClientAgreement.objects.filter(client=request.user, state=request.user.state).order_by("-created_at", "-id")
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

    @transaction.atomic
    def post(self, request, key):
        serializer = SignAgreementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        client = get_object_or_404(Client.objects.select_for_update(), id=request.user, deleted_at__isnull=True)
        existing = get_object_or_404(
            ClientAgreement, id=data["agreement_id"], client=request.user,
            state=client.state, agreement_key=key,
        )
        latest = ClientAgreement.objects.filter(client=request.user, state=client.state, agreement_key=key).order_by("-created_at", "-id").first()
        if latest.pk != existing.pk or agreement_terms_hash(existing) != data["terms_hash"]:
            return Response({"detail": "This form has changed. Refresh and review the current terms before signing."}, status=409)
        if existing.signature_data and existing.signed_name and existing.content_hash:
            return Response({"detail": "This agreement is already signed."}, status=409)
        if not existing.body.strip():
            return Response({"detail": "The agency must supply the agreement terms before it can be signed."}, status=400)
        signed_at = timezone.now()
        signed_name = data["signed_name"]

        payload_to_hash = agreement_terms_payload(existing)
        canonical_json = json.dumps(payload_to_hash, sort_keys=True, separators=(',', ':'))
        hash_input = f"{canonical_json}{signed_name}{signed_at.isoformat()}".encode("utf-8")
        content_hash = hashlib.sha256(hash_input).hexdigest()

        agreement = ClientAgreement.objects.create(
            client=request.user,
            state=client.state,
            agreement_key=key,
            title=existing.title,
            version=existing.version,
            body=existing.body,
            signature_data=data["signature_data"],
            signed_name=signed_name,
            signed_at=signed_at,
            content_hash=content_hash,
        )
        record_audit_log(action="SIGN_CLIENT_AGREEMENT", table_name="client_agreements", record_id=agreement.id,
                         request=request, entity_state=client.state,
                         new_values={"agreement_key": key, "version": agreement.version, "content_hash": content_hash})
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
        from apps.authorizations.serializers import ClientAuthorizationCreateSerializer, AuthorizationSerializer
        client = get_object_or_404(Client, id=request.user, deleted_at__isnull=True)
        serializer = ClientAuthorizationCreateSerializer(data=request.data, context={"request": request, "client": client})
        serializer.is_valid(raise_exception=True)
        auth = serializer.save(client=client, state=client.state, source="client", status="pending")
        record_audit_log(action="SUBMIT_CLIENT_AUTHORIZATION", table_name="authorizations", record_id=auth.id,
                         request=request, entity_state=client.state, new_values={"status": auth.status})
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
