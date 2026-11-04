from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from apps.core.models import State
from .models import WebsiteContent, Service, Form, LicensingInfo, JobPosting
from .serializers import (
    StateSerializer,
    WebsiteContentSerializer,
    ServiceSerializer,
    FormSerializer,
    LicensingInfoSerializer,
    JobPostingSerializer,
    ContactInquirySerializer,
)

class StateListView(APIView):
    """GET /api/v1/states/ - Lists all active operating jurisdictions."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        states = State.objects.filter(active=True)
        return Response(StateSerializer(states, many=True).data)

def get_state_by_param(state_param: str):
    """Resolves State by slug or 2-letter uppercase code."""
    if len(state_param) == 2:
        return get_object_or_404(State, code=state_param.upper(), active=True)
    return get_object_or_404(State, slug=state_param.lower(), active=True)

class StateDetailView(APIView):
    """GET /api/v1/states/{state} - Returns CMS overview content for the state."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, state):
        state_obj = get_state_by_param(state)
        contents = WebsiteContent.objects.filter(state=state_obj, deleted_at__isnull=True)
        return Response({
            "state": StateSerializer(state_obj).data,
            "content": WebsiteContentSerializer(contents, many=True).data,
        })

class StateServicesView(APIView):
    """GET /api/v1/states/{state}/services"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, state):
        state_obj = get_state_by_param(state)
        services = Service.objects.filter(state=state_obj, active=True, deleted_at__isnull=True)
        return Response(ServiceSerializer(services, many=True).data)

class StateFormsView(APIView):
    """GET /api/v1/states/{state}/forms"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, state):
        state_obj = get_state_by_param(state)
        forms = Form.objects.filter(state=state_obj, deleted_at__isnull=True)
        return Response(FormSerializer(forms, many=True).data)

class StateLicensingView(APIView):
    """GET /api/v1/states/{state}/licensing"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, state):
        state_obj = get_state_by_param(state)
        records = LicensingInfo.objects.filter(state=state_obj)
        return Response(LicensingInfoSerializer(records, many=True).data)

class StateCareersView(APIView):
    """GET /api/v1/states/{state}/careers"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, state):
        state_obj = get_state_by_param(state)
        jobs = JobPosting.objects.filter(state=state_obj, active=True, deleted_at__isnull=True)
        return Response(JobPostingSerializer(jobs, many=True).data)

class StateContactView(APIView):
    """POST /api/v1/states/{state}/contact - Ingests public lead inquiry into client_referrals."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, state):
        state_obj = get_state_by_param(state)
        serializer = ContactInquirySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        from apps.clients.models import ClientReferral
        referral = ClientReferral.objects.create(
            state=state_obj,
            first_name=data["first_name"],
            last_name=data["last_name"],
            phone=data["phone"],
            email=data.get("email"),
            referral_source=data.get("referral_source", "Website"),
            notes=data.get("notes", ""),
            status="new",
        )
        return Response(
            {"referral_id": str(referral.id), "status": referral.status},
            status=status.HTTP_201_CREATED,
        )
