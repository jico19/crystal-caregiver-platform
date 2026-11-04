from django.urls import path
from .views import (
    ApplyPublicView,
    CaregiverMeProfileView,
    CaregiverMeApplicationView,
    CaregiverApplicationResubmitView,
    CaregiverCredentialStatusView,
    CaregiverAssignedClientsView,
    CaregiverClientCarePlanView,
    CaregiverClientScheduleView,
)
from apps.compliance.views import NotificationsListView, NotificationMarkReadView, NotificationMarkAllReadView

urlpatterns = [
    path("apply-public", ApplyPublicView.as_view(), name="caregiver_apply_public"),
    path("me", CaregiverMeProfileView.as_view(), name="caregiver_me_profile"),
    path("me/profile", CaregiverMeProfileView.as_view(), name="caregiver_me_profile_patch"),
    path("me/application", CaregiverMeApplicationView.as_view(), name="caregiver_me_application"),
    path("applications/resubmit", CaregiverApplicationResubmitView.as_view(), name="caregiver_resubmit"),
    path("me/credential-status", CaregiverCredentialStatusView.as_view(), name="caregiver_credential_status"),
    path("me/clients", CaregiverAssignedClientsView.as_view(), name="caregiver_assigned_clients"),
    path("me/clients/<uuid:client_id>/care-plan", CaregiverClientCarePlanView.as_view(), name="caregiver_client_care_plan"),
    path("me/clients/<uuid:client_id>/schedule", CaregiverClientScheduleView.as_view(), name="caregiver_client_schedule"),
    path("me/notifications", NotificationsListView.as_view(), name="caregiver_notifications_list"),
    path("me/notifications/read-all", NotificationMarkAllReadView.as_view(), name="caregiver_notification_read_all"),
    path("me/notifications/<uuid:id>/read", NotificationMarkReadView.as_view(), name="caregiver_notification_read"),
]
