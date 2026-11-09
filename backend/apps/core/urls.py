# Route the versioned API independently of serializer implementations.

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.accounts import views as auth
from apps.operations.views import api
from apps.operations.views.public_content import BranchContentList
from apps.operations.views import onboarding_api as onboarding

router = DefaultRouter()
router.register("jobs", api.JobViewSet)
router.register("caregivers", api.CaregiverViewSet)
router.register("clients", api.ClientViewSet)
router.register("applications", api.ApplicationViewSet)

urlpatterns = [
    path("caregivers/<uuid:public_id>/onboarding/", onboarding.OnboardingView.as_view()),
    path("caregivers/<uuid:public_id>/onboarding/complete/", onboarding.CompleteOnboarding.as_view()),
    path("caregivers/<uuid:public_id>/documents/", onboarding.CaregiverDocuments.as_view()),
    path("documents/<uuid:public_id>/", onboarding.DocumentDetail.as_view()),
    path("document-versions/<uuid:public_id>/download/", onboarding.VersionDownload.as_view()),
    path("document-versions/<uuid:public_id>/reviews/", onboarding.VersionReview.as_view()),
    path("staff/onboarding/", onboarding.OnboardingQueue.as_view()),
    path("branch-content/", BranchContentList.as_view()),
    path("", include(router.urls)),
    path("jobs/<uuid:public_id>/apply/", api.ApplyView.as_view()),
    path("branches/", auth.BranchList.as_view()),
    path("auth/csrf/", auth.CSRFView.as_view()),
    path("auth/login/", auth.LoginView.as_view()),
    path("auth/logout/", auth.LogoutView.as_view()),
    path("auth/me/", auth.MeView.as_view()),
    path("auth/invitations/", auth.InvitationView.as_view()),
    path("auth/invitations/accept/", auth.AcceptView.as_view()),
    path("auth/password-reset/", auth.ResetRequestView.as_view()),
    path("auth/password-reset/confirm/", auth.ResetConfirmView.as_view()),
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema")),
]
