from django.urls import path
from .views import (
    ClientMeView,
    ClientIntakeView,
    ClientAgreementsListView,
    ClientAgreementSignView,
    ClientAuthorizationsView,
    ClientCarePlanView,
    ClientScheduleView,
)
from apps.compliance.views import NotificationsListView, NotificationMarkReadView, NotificationMarkAllReadView
from apps.documents.views import ClientDocumentStatusView

urlpatterns = [
    path("me", ClientMeView.as_view(), name="client_me"),
    path("me/profile", ClientMeView.as_view(), name="client_me_profile"),
    path("intake", ClientIntakeView.as_view(), name="client_intake"),
    path("me/agreements", ClientAgreementsListView.as_view(), name="client_agreements_list"),
    path("me/agreements/<str:key>/sign", ClientAgreementSignView.as_view(), name="client_agreements_sign"),
    path("me/authorizations", ClientAuthorizationsView.as_view(), name="client_authorizations"),
    path("me/care-plan/", ClientCarePlanView.as_view(), name="client_care_plan_slash"),
    path("me/care-plan", ClientCarePlanView.as_view(), name="client_care_plan"),
    path("me/schedule", ClientScheduleView.as_view(), name="client_schedule"),
    path("me/document-status", ClientDocumentStatusView.as_view(), name="client_document_status"),
    path("me/notifications", NotificationsListView.as_view(), name="client_notifications_list"),
    path("me/notifications/read-all", NotificationMarkAllReadView.as_view(), name="client_notification_read_all"),
    path("me/notifications/<uuid:id>/read", NotificationMarkReadView.as_view(), name="client_notification_read"),
]
