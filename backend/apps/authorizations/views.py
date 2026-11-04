from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from django.utils import timezone
from apps.core.permissions import IsStateScopedAdmin
from apps.core.mixins import ScopedStateQuerySetMixin
from apps.compliance.audit import record_audit_log
from .models import Authorization
from .serializers import AuthorizationSerializer, AuthorizationCreateSerializer

class AdminAuthorizationListCreateView(ScopedStateQuerySetMixin, generics.ListCreateAPIView):
    """GET /api/v1/admin/authorizations, POST /api/v1/admin/authorizations"""
    permission_classes = [IsStateScopedAdmin]
    serializer_class = AuthorizationSerializer
    queryset = Authorization.objects.filter(deleted_at__isnull=True).select_related("client")

    def perform_create(self, serializer):
        user = self.request.user
        client_id = self.request.data.get("client_id")
        from apps.clients.models import Client
        client = get_object_or_404(Client, id=client_id)
        
        if getattr(user.role, "name", None) == "administrator" and client.state_id != user.state_id:
            raise PermissionDenied("Cannot create authorization for client outside administrator state jurisdiction.")

        serializer.save(
            client=client,
            state=client.state,
            source="admin",
            status="active",
        )

class AdminAuthorizationDetailView(ScopedStateQuerySetMixin, generics.RetrieveUpdateDestroyAPIView):
    """GET /api/v1/admin/authorizations/{id}, PATCH /api/v1/admin/authorizations/{id}"""
    permission_classes = [IsStateScopedAdmin]
    serializer_class = AuthorizationSerializer
    queryset = Authorization.objects.filter(deleted_at__isnull=True)
    lookup_field = "id"

class AdminAuthorizationReviewView(APIView):
    """POST /api/v1/admin/authorizations/{id}/review"""
    permission_classes = [IsStateScopedAdmin]

    def post(self, request, id):
        auth = get_object_or_404(Authorization, id=id, deleted_at__isnull=True)
        if request.user.role.name == "administrator" and auth.state_id != request.user.state_id:
            return Response({"detail": "Forbidden: Authorization outside state jurisdiction."}, status=status.HTTP_403_FORBIDDEN)

        decision = request.data.get("status")
        if decision not in ("approved", "active", "rejected"):
            return Response({"detail": "status must be 'approved' or 'rejected'."}, status=status.HTTP_400_BAD_REQUEST)

        old_status = auth.status
        auth.status = "rejected" if decision == "rejected" else "active"
        auth.reviewed_at = timezone.now()
        auth.reviewed_by = request.user
        auth.save(update_fields=["status", "reviewed_at", "reviewed_by"])

        record_audit_log(
            action="REVIEW_AUTHORIZATION",
            table_name="authorizations",
            record_id=auth.id,
            request=request,
            entity_state=auth.state,
            old_values={"status": old_status},
            new_values={"status": auth.status},
        )

        return Response(AuthorizationSerializer(auth).data)
