from django.urls import path
from .views import (
    AdminAuditLogsListView,
    NotificationsListView,
    NotificationMarkReadView,
    AnnouncementsListView,
)

urlpatterns = [
    path("audit-logs/", AdminAuditLogsListView.as_view(), name="compliance_audit_logs"),
    path("audit-logs", AdminAuditLogsListView.as_view(), name="compliance_audit_logs_no_slash"),
    path("notifications", NotificationsListView.as_view(), name="notifications_list"),
    path("notifications/<uuid:id>/read", NotificationMarkReadView.as_view(), name="notification_read"),
    path("announcements", AnnouncementsListView.as_view(), name="announcements_list"),
]
