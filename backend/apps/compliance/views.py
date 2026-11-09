from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from apps.core.permissions import IsStateScopedAdmin
from apps.core.mixins import ScopedStateQuerySetMixin
from .models import AuditLog, Notification, Announcement
from .serializers import (
    AuditLogSerializer,
    NotificationSerializer,
    AnnouncementSerializer,
    AdminAnnouncementSerializer,
)

class AdminAuditLogsListView(generics.ListAPIView):
    """GET /api/v1/admin/audit-logs - Append-only system audit trail."""
    permission_classes = [IsStateScopedAdmin]
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        user = self.request.user
        qs = AuditLog.objects.all().select_related("user", "entity_state")
        if user.role.name == "administrator" and user.state_id:
            qs = qs.filter(entity_state_id=user.state_id)
        return qs

class NotificationsListView(APIView):
    """GET /api/v1/notifications - Active notifications for authenticated user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        notifs = Notification.objects.filter(user=request.user).order_by("-created_at")[:50]
        return Response(NotificationSerializer(notifs, many=True).data)

class NotificationMarkReadView(APIView):
    """PATCH /api/v1/notifications/{id}/read"""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, id):
        notif = get_object_or_404(Notification, id=id, user=request.user)
        notif.read = True
        notif.save()
        return Response(NotificationSerializer(notif).data)

class NotificationMarkAllReadView(APIView):
    """PATCH /api/v1/notifications/read-all - Marks all of the user's notifications as read."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        updated = Notification.objects.filter(user=request.user, read=False).update(read=True)
        return Response({"detail": f"{updated} notification(s) marked as read."})

class AnnouncementsListView(APIView):
    """GET /api/v1/announcements"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        role_name = getattr(user.role, "name", "all")
        qs = Announcement.objects.filter(active=True, deleted_at__isnull=True)
        if user.state_id:
            qs = qs.filter(Q(state_id=user.state_id) | Q(state__isnull=True))

        if role_name in ("super_admin", "administrator"):
            qs = qs.filter(audience__in=["all", "administrator"])
        else:
            qs = qs.filter(audience__in=["all", role_name])

        return Response(AnnouncementSerializer(qs, many=True).data)

class AdminAnnouncementListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/admin/announcements"""
    permission_classes = [IsStateScopedAdmin]
    serializer_class = AdminAnnouncementSerializer

    def get_queryset(self):
        qs = Announcement.objects.filter(deleted_at__isnull=True).select_related("state", "created_by")
        user = self.request.user
        if user.role.name == "administrator" and user.state_id:
            qs = qs.filter(state_id=user.state_id)
        return qs.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        user = request.user
        if user.role.name == "administrator" and user.state_id:
            data["state_id"] = user.state_id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        announcement = serializer.save(created_by=user)
        return Response(AdminAnnouncementSerializer(announcement).data, status=status.HTTP_201_CREATED)

class AdminAnnouncementDetailView(APIView):
    """PATCH/DELETE /api/v1/admin/announcements/{id}"""
    permission_classes = [IsStateScopedAdmin]

    def get_announcement(self, request, id):
        announce = get_object_or_404(Announcement, id=id, deleted_at__isnull=True)
        if request.user.role.name == "administrator" and announce.state_id != request.user.state_id:
            return None
        return announce

    def patch(self, request, id):
        announce = self.get_announcement(request, id)
        if announce is None:
            return Response({"detail": "Forbidden: Announcement outside state jurisdiction."}, status=status.HTTP_403_FORBIDDEN)
        data = request.data.copy()
        is_active = data.pop("is_active", None)
        serializer = AdminAnnouncementSerializer(announce, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if is_active is not None:
            announce.active = str(is_active).lower() in ("true", "1")
            announce.save()
        return Response(AdminAnnouncementSerializer(announce).data)

    def delete(self, request, id):
        announce = self.get_announcement(request, id)
        if announce is None:
            return Response({"detail": "Forbidden: Announcement outside state jurisdiction."}, status=status.HTTP_403_FORBIDDEN)
        announce.deleted_at = timezone.now()
        announce.save(update_fields=["deleted_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
