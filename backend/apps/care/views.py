from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from apps.core.permissions import IsStateScopedAdmin
from apps.clients.models import Client
from apps.caregivers.models import Caregiver
from apps.compliance.audit import record_audit_log
from .models import CarePlan, CarePlanActivity, CareSchedule, CaregiverClientAssignment
from .serializers import (
    CarePlanSerializer,
    CareScheduleSerializer,
    CaregiverClientAssignmentSerializer,
)

class AdminClientCarePlanView(APIView):
    """GET/PUT /api/v1/admin/clients/{client_id}/care-plan"""
    permission_classes = [IsStateScopedAdmin]

    def get(self, request, client_id):
        client = get_object_or_404(Client, id=client_id)
        if request.user.role.name == "administrator" and client.state_id != request.user.state_id:
            return Response({"detail": "Forbidden: Client outside state jurisdiction."}, status=status.HTTP_403_FORBIDDEN)

        plan = CarePlan.objects.filter(client_id=client.pk, deleted_at__isnull=True).first()
        if not plan:
            return Response({"care_plan": None}, status=status.HTTP_200_OK)
        return Response({"care_plan": CarePlanSerializer(plan).data}, status=status.HTTP_200_OK)

    def put(self, request, client_id):
        client = get_object_or_404(Client, id=client_id)
        if request.user.role.name == "administrator" and client.state_id != request.user.state_id:
            return Response({"detail": "Forbidden: Client outside state jurisdiction."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        plan, created = CarePlan.objects.update_or_create(
            client_id=client.pk,
            defaults={
                "state": client.state,
                "caregiver_id": data.get("caregiver_id") or None,
                "primary_nurse": data.get("primary_nurse", "Unassigned"),
                "emergency_protocol": data.get("emergency_protocol", "Call 911"),
                "created_by": request.user,
                "status": data.get("status", "active"),
            }
        )

        activities_data = data.get("activities", [])
        if activities_data:
            plan.activities.all().delete()
            for idx, act in enumerate(activities_data):
                CarePlanActivity.objects.create(
                    care_plan=plan,
                    task=act.get("task", ""),
                    frequency=act.get("frequency", "Daily"),
                    notes=act.get("notes", ""),
                    sort_order=act.get("sort_order", idx),
                )

        record_audit_log(
            action="CREATE_CARE_PLAN" if created else "UPDATE_CARE_PLAN",
            table_name="care_plans",
            record_id=plan.id,
            request=request,
            entity_state=client.state,
            new_values={
                "status": plan.status,
                "primary_nurse": plan.primary_nurse,
                "effective_date": str(plan.effective_date),
            },
        )

        return Response(CarePlanSerializer(plan).data, status=status.HTTP_200_OK)

class AdminClientScheduleCreateView(APIView):
    """GET/POST /api/v1/admin/clients/{client_id}/schedule"""
    permission_classes = [IsStateScopedAdmin]

    def get(self, request, client_id):
        client = get_object_or_404(Client, id=client_id)
        if request.user.role.name == "administrator" and client.state_id != request.user.state_id:
            return Response({"detail": "Forbidden: Client outside state jurisdiction."}, status=status.HTTP_403_FORBIDDEN)

        schedules = CareSchedule.objects.filter(client_id=client.pk, deleted_at__isnull=True)
        return Response({"schedule": CareScheduleSerializer(schedules, many=True).data})

    def post(self, request, client_id):
        client = get_object_or_404(Client, id=client_id)
        if request.user.role.name == "administrator" and client.state_id != request.user.state_id:
            return Response({"detail": "Forbidden: Client outside state jurisdiction."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        schedule = CareSchedule.objects.create(
            client_id=client.pk,
            caregiver_id=data.get("caregiver_id") or None,
            state=client.state,
            day_of_week=data["day_of_week"],
            start_time=data["start_time"],
            end_time=data["end_time"],
            service=data.get("service") or data.get("service_type", "Personal Care"),
            notes=data.get("notes", ""),
            status=data.get("status", "scheduled"),
        )
        return Response({"schedule": CareScheduleSerializer(schedule).data}, status=status.HTTP_201_CREATED)

class AdminClientScheduleDeleteView(APIView):
    """DELETE /api/v1/admin/clients/{client_id}/schedule/{schedule_id}"""
    permission_classes = [IsStateScopedAdmin]

    def delete(self, request, client_id, schedule_id):
        schedule = get_object_or_404(CareSchedule, id=schedule_id, client_id=client_id, deleted_at__isnull=True)
        if request.user.role.name == "administrator" and schedule.state_id != request.user.state_id:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        schedule.soft_delete(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

class AdminClientAssignmentView(APIView):
    """GET/POST /api/v1/admin/clients/{client_id}/assignments, DELETE /api/v1/admin/clients/{client_id}/assignments/{caregiver_id}"""
    permission_classes = [IsStateScopedAdmin]

    def get(self, request, client_id):
        client = get_object_or_404(Client, id=client_id)
        if request.user.role.name == "administrator" and client.state_id != request.user.state_id:
            return Response({"detail": "Forbidden: Client outside state jurisdiction."}, status=status.HTTP_403_FORBIDDEN)

        assignments = CaregiverClientAssignment.objects.filter(
            client=client,
            ended_at__isnull=True,
        ).select_related("caregiver", "client")
        return Response({"assignments": CaregiverClientAssignmentSerializer(assignments, many=True).data})

    def post(self, request, client_id):
        client = get_object_or_404(Client, id=client_id)
        caregiver_id = request.data.get("caregiver_id")
        role = request.data.get("role", "primary")
        caregiver = get_object_or_404(Caregiver, id=caregiver_id)

        # Enforce state boundary
        if request.user.role.name == "administrator" and client.state_id != request.user.state_id:
            return Response({"detail": "Forbidden: Client outside state jurisdiction."}, status=status.HTTP_403_FORBIDDEN)

        if caregiver.state_id != client.state_id:
            return Response({"detail": "Caregiver state jurisdiction does not match client state."}, status=status.HTTP_400_BAD_REQUEST)

        # Pre-assignment compliance check (Section 8.3)
        from apps.documents.models import DocumentRequirement, Document
        reqs = DocumentRequirement.objects.filter(
            state=client.state,
            for_role__in=["caregiver", "both"],
            required=True
        ).select_related("document_type")
        
        approved_docs = Document.objects.filter(
            owner_id=caregiver_id,
            status="approved",
            deleted_at__isnull=True
        ).values_list("document_type__name", flat=True)

        missing = [r.document_type.name for r in reqs if r.document_type.name not in approved_docs]
        if missing:
            return Response(
                {
                    "detail": "Caregiver cannot be assigned: Missing mandatory compliance credentials.",
                    "missing_requirements": missing,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        assignment, created = CaregiverClientAssignment.objects.update_or_create(
            caregiver=caregiver,
            client=client,
            ended_at__isnull=True,
            defaults={
                "role": role,
                "assigned_by": request.user,
                "assigned_at": timezone.now(),
            }
        )
        return Response(CaregiverClientAssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)

    def delete(self, request, client_id, caregiver_id):
        assignment = get_object_or_404(
            CaregiverClientAssignment,
            client_id=client_id,
            caregiver_id=caregiver_id,
            ended_at__isnull=True,
        )
        if request.user.role.name == "administrator" and assignment.client.state_id != request.user.state_id:
            return Response({"detail": "Forbidden: Client outside state jurisdiction."}, status=status.HTTP_403_FORBIDDEN)

        assignment.ended_at = timezone.now()
        assignment.save()
        return Response({"message": "Assignment terminated."}, status=status.HTTP_200_OK)
