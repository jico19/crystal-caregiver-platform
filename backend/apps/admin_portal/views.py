from datetime import date, timedelta
from django.db.models import Count, Q, OuterRef, Subquery
from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.core.permissions import IsStateScopedAdmin, IsSuperAdmin
from apps.core.mixins import ScopedStateQuerySetMixin
from apps.core.models import State, Role
from apps.caregivers.models import Caregiver, CaregiverApplication
from apps.caregivers.serializers import CaregiverProfileSerializer, CaregiverApplicationSerializer
from apps.clients.models import Client, ClientReferral, ClientAgreement
from apps.clients.serializers import ClientSerializer, ClientReferralSerializer
from apps.documents.models import Document, DocumentRequirement
from apps.documents.serializers import DocumentSerializer
from apps.authorizations.models import Authorization
from apps.care.models import CaregiverClientAssignment
from apps.care.serializers import CaregiverClientAssignmentSerializer
from apps.training.models import TrainingEnrollment, TrainingCourse
from apps.training.serializers import TrainingEnrollmentSerializer
from apps.authentication.serializers import UserSerializer
from apps.compliance.models import Announcement
from apps.compliance.serializers import AnnouncementSerializer
from apps.compliance.audit import record_audit_log

User = get_user_model()

class AdminDashboardView(APIView):
    """GET /api/v1/admin/dashboard - Real-time state metrics."""
    permission_classes = [IsStateScopedAdmin]

    def get(self, request):
        user = request.user
        role_name = getattr(user.role, "name", None)
        state_id = user.state_id if role_name == "administrator" else None

        state_param = request.query_params.get("state")
        selected_state_id = state_id
        if not selected_state_id and state_param and state_param != "all":
            state_obj = State.objects.filter(
                Q(slug__iexact=state_param) | Q(code__iexact=state_param) | Q(name__iexact=state_param)
            ).first()
            if state_obj:
                selected_state_id = state_obj.id

        cg_qs = Caregiver.objects.filter(deleted_at__isnull=True)
        cl_qs = Client.objects.filter(deleted_at__isnull=True)
        app_qs = CaregiverApplication.objects.filter(deleted_at__isnull=True)
        ref_qs = ClientReferral.objects.filter(deleted_at__isnull=True)
        doc_qs = Document.objects.filter(deleted_at__isnull=True)
        auth_qs = Authorization.objects.filter(deleted_at__isnull=True)

        if selected_state_id:
            cg_qs = cg_qs.filter(state_id=selected_state_id)
            cl_qs = cl_qs.filter(state_id=selected_state_id)
            app_qs = app_qs.filter(state_id=selected_state_id)
            ref_qs = ref_qs.filter(state_id=selected_state_id)
            doc_qs = doc_qs.filter(state_id=selected_state_id)
            auth_qs = auth_qs.filter(state_id=selected_state_id)

        thirty_days = date.today() + timedelta(days=30)
        expiring_docs_count = doc_qs.filter(
            status="approved",
            expiration_date__lte=thirty_days,
            expiration_date__gte=date.today(),
        ).count()

        active_caregivers = cg_qs.count()
        active_clients = cl_qs.filter(status="active").count()
        pending_clients = cl_qs.filter(status="pending").count()
        pending_apps = app_qs.filter(status="submitted").count()
        pending_refs = ref_qs.filter(status="new").count()
        active_auths = auth_qs.filter(status="active").count()

        ann_qs = Announcement.objects.filter(active=True, deleted_at__isnull=True)
        if selected_state_id:
            ann_qs = ann_qs.filter(Q(state_id=selected_state_id) | Q(state__isnull=True))
        ann_qs = ann_qs.filter(audience__in=["all", "administrator"]).order_by("-created_at")[:10]
        announcements_data = AnnouncementSerializer(ann_qs, many=True).data

        return Response({
            "state_scope": selected_state_id or "ALL",
            "active_caregivers": active_caregivers,
            "active_clients": active_clients,
            "pending_clients": pending_clients,
            "pending_applications": pending_apps,
            "pending_referrals": pending_refs,
            "expiring_documents": expiring_docs_count,
            "active_authorizations": active_auths,
            "metrics": {
                "total_caregivers": active_caregivers,
                "total_clients": active_clients,
                "pending_applications": pending_apps,
                "pending_documents": expiring_docs_count,
                "new_referrals": pending_refs,
                "pending_compliance": expiring_docs_count,
            },
            "announcements": announcements_data,
        })

class AdminReportsView(APIView):
    """GET /api/v1/admin/reports - Summary metrics."""
    permission_classes = [IsStateScopedAdmin]

    def get(self, request):
        states = State.objects.filter(active=True)
        if not IsSuperAdmin().has_permission(request, self):
            states = states.filter(id=request.user.state_id)
        from .reports import build_operational_reports
        return Response(build_operational_reports(states))

class AdminCaregiverListView(ScopedStateQuerySetMixin, generics.ListAPIView):
    """GET /api/v1/admin/caregivers - Paginated roster."""
    permission_classes = [IsStateScopedAdmin]
    serializer_class = CaregiverProfileSerializer
    queryset = Caregiver.objects.filter(deleted_at__isnull=True).select_related("state", "id")

    def get_queryset(self):
        latest_application = CaregiverApplication.objects.filter(
            caregiver_id=OuterRef("pk"), deleted_at__isnull=True,
        ).order_by("-submitted_at", "-created_at")
        queryset = super().get_queryset().annotate(
            latest_application_status=Subquery(latest_application.values("status")[:1]),
        )
        if self.request.query_params.get("has_application") == "true":
            queryset = queryset.filter(latest_application_status__isnull=False)
        application_status = self.request.query_params.get("status")
        if application_status and application_status != "all":
            queryset = queryset.filter(latest_application_status=application_status)
        return queryset

class AdminCaregiverAnalyticsView(APIView):
    """GET /api/v1/admin/caregivers/analytics - Application funnel conversion counts."""
    permission_classes = [IsStateScopedAdmin]

    def get(self, request):
        qs = CaregiverApplication.objects.filter(deleted_at__isnull=True)
        cg_qs = Caregiver.objects.filter(deleted_at__isnull=True)
        if request.user.role.name == "administrator" and request.user.state_id:
            qs = qs.filter(state_id=request.user.state_id)
            cg_qs = cg_qs.filter(state_id=request.user.state_id)

        submitted_count = qs.filter(status="submitted").count()
        under_review_count = qs.filter(status="under_review").count()
        onboarding_count = qs.filter(status="onboarding").count()

        return Response({
            "total_applications": qs.count(),
            "total_caregivers": cg_qs.count(),
            "pending_applications": submitted_count + under_review_count,
            "in_onboarding": onboarding_count,
            "submitted": submitted_count,
            "under_review": under_review_count,
            "approved": qs.filter(status="approved").count(),
            "rejected": qs.filter(status="rejected").count(),
            "onboarding": onboarding_count,
        })

class AdminCaregiverApplicationDetailView(APIView):
    """GET /api/v1/admin/caregivers/{application_id}"""
    permission_classes = [IsStateScopedAdmin]

    def get(self, request, application_id):
        app = get_object_or_404(CaregiverApplication, id=application_id, deleted_at__isnull=True)
        if request.user.role.name == "administrator" and app.state_id != request.user.state_id:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        data = CaregiverApplicationSerializer(app).data
        cg = app.caregiver
        cg_profile = CaregiverProfileSerializer(cg).data
        state = cg.state if cg.state_id else None
        cg_profile["states"] = {
            "id": state.id,
            "code": state.code,
            "name": state.name,
        } if state else None
        cg_user = cg.id if cg else None
        cg_profile["users"] = {
            "id": cg_user.id,
            "email": cg_user.email,
            "role": cg_user.role.name if cg_user.role else None,
            "status": cg_user.status,
            "is_active": cg_user.is_active,
        } if cg_user else None
        data["caregivers"] = cg_profile
        data["users"] = cg_profile["users"]
        data["states"] = cg_profile["states"]

        enrollments = TrainingEnrollment.objects.filter(caregiver=app.caregiver).select_related("course")
        return Response({
            "application": data,
            "enrollments": TrainingEnrollmentSerializer(enrollments, many=True).data,
        })

class AdminCaregiverApplicationReviewView(APIView):
    """POST /api/v1/admin/caregivers/{application_id}/review"""
    permission_classes = [IsStateScopedAdmin]

    def post(self, request, application_id):
        app = get_object_or_404(CaregiverApplication, id=application_id, deleted_at__isnull=True)
        if request.user.role.name == "administrator" and app.state_id != request.user.state_id:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        status_val = request.data.get("status")
        notes = request.data.get("notes", "")
        rejection_reason = request.data.get("rejection_reason")

        if status_val not in ("approved", "rejected", "under_review", "onboarding"):
            return Response({"detail": "Invalid application status."}, status=status.HTTP_400_BAD_REQUEST)

        old_status = app.status
        app.status = status_val
        app.notes = notes
        app.rejection_reason = rejection_reason
        app.reviewed_at = timezone.now()
        app.reviewed_by = request.user
        app.save()

        record_audit_log(
            action="REVIEW_CAREGIVER_APPLICATION",
            table_name="caregiver_applications",
            record_id=app.id,
            request=request,
            entity_state=app.state,
            old_values={"status": old_status},
            new_values={
                "status": app.status,
                "rejection_reason": app.rejection_reason,
                "notes": app.notes,
            },
        )

        return Response(CaregiverApplicationSerializer(app).data)


class AdminCaregiverComplianceView(APIView):
    """GET /api/v1/admin/caregivers/{caregiver_id}/compliance"""
    permission_classes = [IsStateScopedAdmin]

    def get(self, request, caregiver_id):
        from apps.caregivers.services import caregiver_credential_status

        cg = get_object_or_404(Caregiver, id=caregiver_id, deleted_at__isnull=True)
        self.check_object_permissions(request, cg)
        result = caregiver_credential_status(cg)
        return Response({
            "caregiver_id": str(cg.id),
            **result,
            "approved_credentials": result["approved"] + result["expiring_soon"],
        })

class AdminCaregiverAssignmentsView(APIView):
    """GET /api/v1/admin/caregivers/{caregiver_id}/assignments"""
    permission_classes = [IsStateScopedAdmin]

    def get(self, request, caregiver_id):
        cg = get_object_or_404(Caregiver, id=caregiver_id)
        if request.user.role.name == "administrator" and cg.state_id != request.user.state_id:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        assignments = CaregiverClientAssignment.objects.filter(
            caregiver=cg,
            ended_at__isnull=True,
        ).select_related("caregiver", "client")
        return Response({"assignments": CaregiverClientAssignmentSerializer(assignments, many=True).data})

class AdminClientListView(ScopedStateQuerySetMixin, generics.ListAPIView):
    """GET /api/v1/admin/clients - Paginated client list with search & filters."""
    permission_classes = [IsStateScopedAdmin]
    serializer_class = ClientSerializer
    queryset = Client.objects.filter(deleted_at__isnull=True).select_related("state", "id")

    def get_queryset(self):
        qs = super().get_queryset()
        params = getattr(self.request, "query_params", getattr(self.request, "GET", {}))
        status_param = params.get("status")
        if status_param and status_param != "all":
            qs = qs.filter(status=status_param)

        state_param = params.get("state")
        if state_param and state_param != "all":
            qs = qs.filter(Q(state__code__iexact=state_param) | Q(state__slug__iexact=state_param))

        search = params.get("search")
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(medicaid_number__icontains=search)
                | Q(phone__icontains=search)
                | Q(id__email__icontains=search)
            )

        sort_by = params.get("sort_by")
        if sort_by == "service_start_date":
            qs = qs.order_by("service_start_date", "-created_at")
        else:
            qs = qs.order_by("-created_at")

        return qs

class AdminClientDetailView(APIView):
    """GET /api/v1/admin/clients/{client_id}"""
    permission_classes = [IsStateScopedAdmin]

    def get(self, request, client_id):
        client = get_object_or_404(Client, id=client_id, deleted_at__isnull=True)
        if request.user.role.name == "administrator" and client.state_id != request.user.state_id:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        agreements = ClientAgreement.objects.filter(client_id=client.id)
        from apps.clients.serializers import ClientAgreementSerializer
        return Response({
            "client": ClientSerializer(client).data,
            "agreements": ClientAgreementSerializer(agreements, many=True).data,
        })

class AdminClientAdmissionView(APIView):
    """POST /api/v1/admin/clients/{client_id}/admission"""
    permission_classes = [IsStateScopedAdmin]

    def post(self, request, client_id):
        client = get_object_or_404(Client, id=client_id, deleted_at__isnull=True)
        if request.user.role.name == "administrator" and client.state_id != request.user.state_id:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        old_status = client.status
        client.status = request.data.get("status", "approved")
        client.service_start_date = request.data.get("service_start_date")
        client.admission_notes = request.data.get("admission_notes", "")
        client.rejection_reason = request.data.get("rejection_reason", "")
        client.admitted_by = request.user
        client.admitted_at = timezone.now()
        client.save()

        record_audit_log(
            action="ADMIT_CLIENT" if client.status in ("approved", "active") else "REJECT_CLIENT",
            table_name="clients",
            record_id=client.id,
            request=request,
            entity_state=client.state,
            old_values={"status": old_status},
            new_values={
                "status": client.status,
                "service_start_date": str(client.service_start_date) if client.service_start_date else None,
                "rejection_reason": client.rejection_reason,
            },
        )

        return Response(ClientSerializer(client).data)

class AdminReferralsListView(ScopedStateQuerySetMixin, generics.ListAPIView):
    """GET /api/v1/admin/referrals - Inbound leads pipeline."""
    permission_classes = [IsStateScopedAdmin]
    serializer_class = ClientReferralSerializer
    queryset = ClientReferral.objects.filter(deleted_at__isnull=True).select_related("state")

class AdminReferralDetailView(APIView):
    """PATCH /api/v1/admin/referrals/{referral_id}"""
    permission_classes = [IsStateScopedAdmin]

    def patch(self, request, referral_id):
        referral = get_object_or_404(ClientReferral, id=referral_id, deleted_at__isnull=True)
        if request.user.role.name == "administrator" and referral.state_id != request.user.state_id:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        old_status = referral.status
        serializer = ClientReferralSerializer(referral, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_referral = serializer.save()

        record_audit_log(
            action="UPDATE_REFERRAL_STATUS",
            table_name="client_referrals",
            record_id=updated_referral.id,
            request=request,
            entity_state=updated_referral.state,
            old_values={"status": old_status},
            new_values={
                "status": updated_referral.status,
                "handled_notes": updated_referral.handled_notes,
                "converted_client_id": updated_referral.converted_client_id,
            },
        )
        return Response(serializer.data)

class AdminReferralsAnalyticsView(APIView):
    """GET /api/v1/admin/referrals/analytics"""
    permission_classes = [IsStateScopedAdmin]

    def get(self, request):
        qs = ClientReferral.objects.filter(deleted_at__isnull=True)
        if request.user.role.name == "administrator" and request.user.state_id:
            qs = qs.filter(state_id=request.user.state_id)

        total = qs.count()
        by_status = {
            "new": qs.filter(status="new").count(),
            "contacted": qs.filter(status="contacted").count(),
            "converted": qs.filter(status="converted").count(),
            "closed": qs.filter(status="closed").count(),
        }
        source_rows = qs.values("referral_source").annotate(
            count=Count("id"),
        ).order_by("-count")
        conversion_rate_pct = round((by_status["converted"] / total * 100), 1) if total else 0.0

        return Response({
            "total_referrals": total,
            "by_status": by_status,
            "by_source": [{"source": r["referral_source"] or "Unknown", "count": r["count"]} for r in source_rows],
            "conversion_rate_pct": conversion_rate_pct,
        })

class AdminTrainingListCreateView(APIView):
    """GET/POST /api/v1/admin/training - Paginated enrollment roster."""
    permission_classes = [IsStateScopedAdmin]

    def get(self, request):
        qs = TrainingEnrollment.objects.select_related("course", "caregiver", "caregiver__id", "caregiver__state")
        user = request.user
        if user.role.name == "administrator" and user.state_id:
            qs = qs.filter(caregiver__state_id=user.state_id)
        status_filter = request.query_params.get("status")
        if status_filter in ("in_progress", "completed"):
            qs = qs.filter(status=status_filter)
        qs = qs.order_by("-enrolled_at")

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = TrainingEnrollmentSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = TrainingEnrollmentSerializer(qs, many=True)
        return Response(serializer.data)

    @property
    def paginator(self):
        if not hasattr(self, "_paginator"):
            from rest_framework.pagination import PageNumberPagination
            self._paginator = PageNumberPagination()
        return self._paginator

    def paginate_queryset(self, queryset):
        return self.paginator.paginate_queryset(queryset, self.request, view=self)

    def get_paginated_response(self, data):
        return self.paginator.get_paginated_response(data)

    def post(self, request):
        user = request.user
        caregiver_id = request.data.get("caregiver_id")
        course_id = request.data.get("course_id")
        if not caregiver_id or not course_id:
            return Response({"detail": "caregiver_id and course_id are required."}, status=status.HTTP_400_BAD_REQUEST)

        caregiver = get_object_or_404(Caregiver, id=caregiver_id)
        if user.role.name == "administrator" and caregiver.state_id != user.state_id:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        course = get_object_or_404(TrainingCourse, id=course_id)
        enrollment, created = TrainingEnrollment.objects.get_or_create(
            course=course,
            caregiver=caregiver,
            defaults={
                "status": "in_progress",
                "due_at": date.today() + timedelta(days=course.validity_months * 30),
            },
        )
        return Response(TrainingEnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED)

class AdminLegalHoldToggleView(APIView):
    """PATCH /api/v1/admin/{resource}/{id}/legal-hold"""
    permission_classes = [IsStateScopedAdmin]

    def patch(self, request, resource, id):
        model_map = {
            "clients": Client,
            "caregivers": Caregiver,
            "documents": Document,
        }
        model = model_map.get(resource)
        if not model:
            return Response({"detail": f"Unknown resource '{resource}'."}, status=status.HTTP_400_BAD_REQUEST)

        obj = get_object_or_404(model, id=id)
        if request.user.role.name == "administrator" and obj.state_id != request.user.state_id:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        old_hold = obj.legal_hold
        obj.legal_hold = not obj.legal_hold
        obj.save()

        record_audit_log(
            action="TOGGLE_LEGAL_HOLD",
            table_name=resource,
            record_id=obj.pk,
            request=request,
            entity_state=getattr(obj, "state", None),
            old_values={"legal_hold": old_hold},
            new_values={"legal_hold": obj.legal_hold},
        )

        return Response({"id": str(obj.pk), "legal_hold": obj.legal_hold})

class AdminRestoreEntityView(APIView):
    """POST /api/v1/admin/{resource}/{id}/restore"""
    permission_classes = [IsStateScopedAdmin]

    def post(self, request, resource, id):
        model_map = {
            "clients": Client,
            "caregivers": Caregiver,
            "documents": Document,
            "referrals": ClientReferral,
            "authorizations": Authorization,
        }
        model = model_map.get(resource)
        if not model:
            return Response({"detail": f"Unknown resource '{resource}'."}, status=status.HTTP_400_BAD_REQUEST)

        obj = get_object_or_404(model, id=id)
        if request.user.role.name == "administrator" and obj.state_id != request.user.state_id:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        obj.restore()

        record_audit_log(
            action="RESTORE_ENTITY",
            table_name=resource,
            record_id=obj.pk,
            request=request,
            entity_state=getattr(obj, "state", None),
            new_values={"status": "restored"},
        )


        return Response({"message": f"{resource.rstrip('s')} restored successfully.", "id": str(obj.id)})


class AdminUsersListView(generics.ListAPIView):
    """GET /api/v1/admin/users - User management (Super Admin)."""
    permission_classes = [IsSuperAdmin]
    serializer_class = UserSerializer
    queryset = User.objects.filter(deleted_at__isnull=True).select_related("role", "state")

class AdminUserStatusView(APIView):
    """POST /api/v1/admin/users/{user_id}/status"""
    permission_classes = [IsSuperAdmin]

    def post(self, request, user_id):
        target_user = get_object_or_404(User, id=user_id)
        new_status = request.data.get("status")
        if new_status not in ("active", "inactive", "suspended"):
            return Response({"detail": "Invalid user status."}, status=status.HTTP_400_BAD_REQUEST)
        old_status = target_user.status
        target_user.status = new_status
        target_user.is_active = (new_status == "active")
        target_user.save()

        record_audit_log(
            action="UPDATE_USER_STATUS",
            table_name="users",
            record_id=target_user.id,
            request=request,
            entity_state=target_user.state,
            old_values={"status": old_status},
            new_values={"status": target_user.status, "is_active": target_user.is_active},
        )
        return Response(UserSerializer(target_user).data)

class AdminUserRoleView(APIView):
    """POST /api/v1/admin/users/{user_id}/role"""
    permission_classes = [IsSuperAdmin]

    def post(self, request, user_id):
        target_user = get_object_or_404(User, id=user_id)
        role_name = request.data.get("role")
        role = get_object_or_404(Role, name=role_name)
        target_user.role = role
        target_user.save()
        return Response(UserSerializer(target_user).data)

class AdminUserStateView(APIView):
    """POST /api/v1/admin/users/{user_id}/state"""
    permission_classes = [IsSuperAdmin]

    def post(self, request, user_id):
        target_user = get_object_or_404(User, id=user_id)
        state_id = request.data.get("state_id")
        state = get_object_or_404(State, id=state_id) if state_id else None
        target_user.state = state
        target_user.save()
        return Response(UserSerializer(target_user).data)

class AdminUserDeleteView(APIView):
    """DELETE /api/v1/admin/users/{user_id}"""
    permission_classes = [IsSuperAdmin]

    def delete(self, request, user_id):
        target_user = get_object_or_404(User, id=user_id)
        target_user.deleted_at = timezone.now()
        target_user.deleted_by = request.user
        target_user.is_active = False
        target_user.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
