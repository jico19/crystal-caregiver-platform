from django.urls import path
from apps.documents.views import (
    AdminDocumentListView,
    AdminDocumentReviewView,
    AdminDocumentRequirementsView,
    AdminCaregiverDocumentsView,
)
from apps.authorizations.views import (
    AdminAuthorizationListCreateView,
    AdminAuthorizationDetailView,
    AdminAuthorizationReviewView,
)
from apps.compliance.views import (
    AdminAuditLogsListView,
    NotificationsListView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    AdminAnnouncementListCreateView,
    AdminAnnouncementDetailView,
)
from .views import (
    AdminDashboardView,
    AdminReportsView,
    AdminCaregiverListView,
    AdminCaregiverAnalyticsView,
    AdminCaregiverApplicationDetailView,
    AdminCaregiverApplicationReviewView,
    AdminCaregiverComplianceView,
    AdminCaregiverAssignmentsView,
    AdminClientListView,
    AdminClientDetailView,
    AdminClientAdmissionView,
    AdminReferralsListView,
    AdminReferralDetailView,
    AdminReferralsAnalyticsView,
    AdminTrainingListCreateView,
    AdminLegalHoldToggleView,
    AdminRestoreEntityView,
    AdminUsersListView,
    AdminUserStatusView,
    AdminUserRoleView,
    AdminUserStateView,
    AdminUserDeleteView,
)

urlpatterns = [
    # 8.1 Dashboard & Analytics
    path("dashboard", AdminDashboardView.as_view(), name="admin_dashboard"),
    path("reports", AdminReportsView.as_view(), name="admin_reports"),

    # 8.2 Caregiver Management
    path("caregivers", AdminCaregiverListView.as_view(), name="admin_caregivers_list"),
    path("caregivers/analytics", AdminCaregiverAnalyticsView.as_view(), name="admin_caregivers_analytics"),
    path("caregivers/<uuid:caregiver_id>/documents", AdminCaregiverDocumentsView.as_view(), name="admin_caregivers_documents"),
    path("caregivers/<uuid:application_id>", AdminCaregiverApplicationDetailView.as_view(), name="admin_caregivers_app_detail"),
    path("caregivers/<uuid:application_id>/review", AdminCaregiverApplicationReviewView.as_view(), name="admin_caregivers_app_review"),
    path("caregivers/<uuid:caregiver_id>/compliance", AdminCaregiverComplianceView.as_view(), name="admin_caregivers_compliance"),
    path("caregivers/<uuid:caregiver_id>/assignments", AdminCaregiverAssignmentsView.as_view(), name="admin_caregivers_assignments"),

    # 8.3 Client Admission & Care Operations
    path("clients", AdminClientListView.as_view(), name="admin_clients_list"),
    path("clients/<uuid:client_id>", AdminClientDetailView.as_view(), name="admin_clients_detail"),
    path("clients/<uuid:client_id>/admission", AdminClientAdmissionView.as_view(), name="admin_clients_admission"),

    # 8.4 Authorizations
    path("authorizations", AdminAuthorizationListCreateView.as_view(), name="admin_authorizations_list"),
    path("authorizations/<uuid:id>", AdminAuthorizationDetailView.as_view(), name="admin_authorizations_detail"),
    path("authorizations/<uuid:id>/review", AdminAuthorizationReviewView.as_view(), name="admin_authorizations_review"),

    # 8.5 Referrals
    path("referrals", AdminReferralsListView.as_view(), name="admin_referrals_list"),
    path("referrals/analytics", AdminReferralsAnalyticsView.as_view(), name="admin_referrals_analytics"),
    path("referrals/<uuid:referral_id>", AdminReferralDetailView.as_view(), name="admin_referrals_detail"),

    # 8.6 Document Compliance Review
    path("documents", AdminDocumentListView.as_view(), name="admin_documents_list"),
    path("documents/<uuid:document_id>/review", AdminDocumentReviewView.as_view(), name="admin_documents_review"),
    path("settings/document-requirements", AdminDocumentRequirementsView.as_view(), name="admin_document_requirements"),

    # 8.6b Training Roster
    path("training", AdminTrainingListCreateView.as_view(), name="admin_training_list_create"),

    # 8.7 Legal Hold & Restoration
    path("<str:resource>/<uuid:id>/legal-hold", AdminLegalHoldToggleView.as_view(), name="admin_legal_hold_toggle"),
    path("<str:resource>/<uuid:id>/restore", AdminRestoreEntityView.as_view(), name="admin_restore_entity"),

    # 8.8 Audit Logs, Notifications, Announcements & User Administration
    path("audit-logs/", AdminAuditLogsListView.as_view(), name="admin_audit_logs"),
    path("audit-logs", AdminAuditLogsListView.as_view(), name="admin_audit_logs_no_slash"),
    path("notifications", NotificationsListView.as_view(), name="admin_notifications_list"),
    path("notifications/read-all", NotificationMarkAllReadView.as_view(), name="admin_notification_read_all"),
    path("notifications/<uuid:id>/read", NotificationMarkReadView.as_view(), name="admin_notification_read"),
    path("announcements", AdminAnnouncementListCreateView.as_view(), name="admin_announcements_list"),
    path("announcements/<uuid:id>", AdminAnnouncementDetailView.as_view(), name="admin_announcements_detail"),
    path("users", AdminUsersListView.as_view(), name="admin_users_list"),
    path("users/<uuid:user_id>/status", AdminUserStatusView.as_view(), name="admin_users_status"),
    path("users/<uuid:user_id>/role", AdminUserRoleView.as_view(), name="admin_users_role"),
    path("users/<uuid:user_id>/state", AdminUserStateView.as_view(), name="admin_users_state"),
    path("users/<uuid:user_id>", AdminUserDeleteView.as_view(), name="admin_users_delete"),
]
