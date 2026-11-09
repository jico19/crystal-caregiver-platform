from django.conf import settings
from django.urls import reverse
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView
from rest_framework.response import Response


def test_public_health_response(client):
    response = client.get(reverse("health"))
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_rejects_writes(client):
    assert client.post(reverse("health"), {}).status_code == 405


def test_default_api_denies_anonymous_requests():
    class PrivateView(APIView):
        def get(self, request):
            return Response({"private": True})

    assert PrivateView.authentication_classes == [SessionAuthentication]
    assert PrivateView.permission_classes == [IsAuthenticated]
    response = PrivateView.as_view()(APIRequestFactory().get("/private/"))
    assert response.status_code == 403
    assert "django.middleware.csrf.CsrfViewMiddleware" in settings.MIDDLEWARE


def test_custom_user_persists_with_hashed_password(db, django_user_model):
    user = django_user_model.objects.create_user(
        username="synthetic-user",
        password="synthetic-test-password",
    )
    user.refresh_from_db()
    assert django_user_model._meta.label == "accounts.User"
    assert user.check_password("synthetic-test-password")
    assert user.password != "synthetic-test-password"
