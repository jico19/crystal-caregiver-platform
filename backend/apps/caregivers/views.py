from datetime import date, timedelta
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from apps.core.permissions import IsCaregiver
from .models import Caregiver, CaregiverApplication
from .serializers import (
    CaregiverProfileSerializer,
    CaregiverApplicationSerializer,
    CaregiverApplyPublicSerializer,
)

class ApplyPublicView(APIView):
    """POST /api/v1/caregivers/apply-public - Atomic applicant onboarding."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CaregiverApplyPublicSerializer(data=request.data)
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
        serializer = CaregiverProfileSerializer(caregiver, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
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
        app = CaregiverApplication.objects.filter(caregiver=caregiver, deleted_at__isnull=True).order_by("-submitted_at").first()
        
        signature_data = request.data.get("signature_data")
        signed_name = request.data.get("signed_name", f"{caregiver.first_name} {caregiver.last_name}")
        
        if not signature_data:
            return Response({"detail": "signature_data is required for resubmission."}, status=status.HTTP_400_BAD_REQUEST)

        version = (app.version + 1) if app else 1
        new_app = CaregiverApplication.objects.create(
            caregiver=caregiver,
            state=caregiver.state,
            status="submitted",
            submitted_at=timezone.now(),
            signature_data=signature_data,
            signed_name=signed_name,
            signed_at=timezone.now(),
            version=version,
            content_hash=f"resubmitted_v{version}_{caregiver.id}",
        )
        return Response(
            {"application_id": str(new_app.id), "status": new_app.status, "version": new_app.version},
            status=status.HTTP_201_CREATED,
        )

class CaregiverCredentialStatusView(APIView):
    """GET /api/v1/caregivers/me/credential-status"""
    permission_classes = [IsCaregiver]

    def get(self, request):
        caregiver = get_object_or_404(Caregiver, id=request.user)
        from apps.documents.models import Document, DocumentRequirement
        
        reqs = DocumentRequirement.objects.filter(
            state=caregiver.state,
            for_role__in=["caregiver", "both"],
            required=True
        ).select_related("document_type")

        now = date.today()
        thirty_days = now + timedelta(days=30)
        docs = Document.objects.filter(owner=request.user, deleted_at__isnull=True)

        approved = []
        expired = []
        expiring_soon = []
        doc_type_names = set()

        for d in docs:
            dt_name = d.document_type.name
            doc_type_names.add(dt_name)
            if d.status == "approved":
                if d.expiration_date and d.expiration_date < now:
                    expired.append(dt_name)
                elif d.expiration_date and d.expiration_date <= thirty_days:
                    expiring_soon.append(dt_name)
                else:
                    approved.append(dt_name)
            elif d.status == "expired":
                expired.append(dt_name)

        missing = []
        for r in reqs:
            if r.document_type.name not in approved and r.document_type.name not in expiring_soon:
                missing.append(r.document_type.name)

        compliant = len(missing) == 0 and len(expired) == 0

        return Response({
            "compliant": compliant,
            "missing_requirements": missing,
            "expiring_soon": expiring_soon,
            "expired": expired,
            "approved": approved,
        })

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
