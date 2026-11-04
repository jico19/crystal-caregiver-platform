from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from apps.core.permissions import IsCaregiver
from apps.compliance.audit import record_audit_log
from .models import Caregiver, CaregiverApplication
from .serializers import (
    CaregiverProfileSerializer,
    CaregiverApplicationSerializer,
    CaregiverApplyPublicSerializer,
    CaregiverApplicationResubmitSerializer,
)
from .services import caregiver_credential_status, resubmit_caregiver_application

class ApplyPublicView(APIView):
    """POST /api/v1/caregivers/apply-public - Atomic applicant onboarding."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CaregiverApplyPublicSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        application = serializer.save()
        return Response(
            {"application_id": str(application.id), "status": application.status},
            status=status.HTTP_201_CREATED,
        )

class CaregiverMeProfileView(APIView):
    """GET /api/v1/caregivers/me, PATCH /api/v1/caregivers/me/profile"""
    permission_classes = [IsCaregiver]

    def get(self, request):
        caregiver = get_object_or_404(Caregiver, id=request.user)
        return Response(CaregiverProfileSerializer(caregiver).data)

    def patch(self, request):
        caregiver = get_object_or_404(Caregiver, id=request.user)
        old_values = {key: getattr(caregiver, key) for key in ("first_name", "last_name", "phone")}
        serializer = CaregiverProfileSerializer(caregiver, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        record_audit_log(
            action="UPDATE_CAREGIVER_PROFILE", table_name="caregivers", record_id=caregiver.pk,
            request=request, entity_state=caregiver.state, old_values=old_values,
            new_values={key: getattr(caregiver, key) for key in old_values},
        )
        return Response(serializer.data)

class CaregiverMeApplicationView(APIView):
    """GET /api/v1/caregivers/me/application"""
    permission_classes = [IsCaregiver]

    def get(self, request):
        caregiver = get_object_or_404(Caregiver, id=request.user)
        app = CaregiverApplication.objects.filter(caregiver=caregiver, deleted_at__isnull=True).order_by("-submitted_at").first()
        if not app:
            return Response({"detail": "No active application found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CaregiverApplicationSerializer(app).data)

class CaregiverApplicationResubmitView(APIView):
    """POST /api/v1/caregivers/applications/resubmit"""
    permission_classes = [IsCaregiver]

    def post(self, request):
        caregiver = get_object_or_404(Caregiver, id=request.user)
        serializer = CaregiverApplicationResubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_app = resubmit_caregiver_application(caregiver, serializer.validated_data, request=request)
        return Response(
            {"application_id": str(new_app.id), "status": new_app.status, "version": new_app.version},
            status=status.HTTP_201_CREATED,
        )

class CaregiverCredentialStatusView(APIView):
    """GET /api/v1/caregivers/me/credential-status"""
    permission_classes = [IsCaregiver]

    def get(self, request):
        caregiver = get_object_or_404(Caregiver, id=request.user)
        return Response(caregiver_credential_status(caregiver))

class CaregiverAssignedClientsView(APIView):
    """GET /api/v1/caregivers/me/clients"""
    permission_classes = [IsCaregiver]

    def get(self, request):
        caregiver = get_object_or_404(Caregiver, id=request.user)
        from apps.care.models import CaregiverClientAssignment
        from apps.clients.serializers import ClientSerializer

        assignments = CaregiverClientAssignment.objects.filter(
            caregiver=caregiver,
            ended_at__isnull=True
        ).select_related("client")

        from apps.clients.serializers import CaregiverAssignedClientSerializer
        clients = [a.client for a in assignments]
        return Response(CaregiverAssignedClientSerializer(clients, many=True).data)


class CaregiverClientCarePlanView(APIView):
    """GET /api/v1/caregivers/me/clients/{client_id}/care-plan"""
    permission_classes = [IsCaregiver]

    def get(self, request, client_id):
        caregiver = get_object_or_404(Caregiver, id=request.user)
        from apps.care.models import CaregiverClientAssignment, CarePlan
        from apps.care.serializers import CarePlanSerializer

        # Ensure assignment exists
        is_assigned = CaregiverClientAssignment.objects.filter(
            caregiver=caregiver,
            client_id=client_id,
            ended_at__isnull=True
        ).exists()

        if not is_assigned and getattr(request.user.role, "name", None) != "super_admin":
            return Response({"detail": "Not authorized to view care plan for unassigned client."}, status=status.HTTP_403_FORBIDDEN)

        care_plan = get_object_or_404(CarePlan, client_id=client_id, deleted_at__isnull=True)
        return Response(CarePlanSerializer(care_plan).data)

class CaregiverClientScheduleView(APIView):
    """GET /api/v1/caregivers/me/clients/{client_id}/schedule"""
    permission_classes = [IsCaregiver]

    def get(self, request, client_id):
        caregiver = get_object_or_404(Caregiver, id=request.user)
        from apps.care.models import CaregiverClientAssignment, CareSchedule
        from apps.care.serializers import CareScheduleSerializer

        is_assigned = CaregiverClientAssignment.objects.filter(
            caregiver=caregiver,
            client_id=client_id,
            ended_at__isnull=True
        ).exists()

        if not is_assigned and getattr(request.user.role, "name", None) != "super_admin":
            return Response({"detail": "Not authorized to view schedule for unassigned client."}, status=status.HTTP_403_FORBIDDEN)

        schedules = CareSchedule.objects.filter(client_id=client_id, deleted_at__isnull=True)
        return Response(CareScheduleSerializer(schedules, many=True).data)
