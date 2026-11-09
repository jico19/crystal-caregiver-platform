from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.accounts import views as auth
from apps.operations import api

router = DefaultRouter()
router.register("jobs", api.JobViewSet)
router.register("caregivers", api.CaregiverViewSet)
router.register("clients", api.ClientViewSet)
router.register("applications", api.ApplicationViewSet)

urlpatterns = [
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
