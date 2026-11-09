from rest_framework.test import APITestCase
from rest_framework import status
from django.core.management import call_command
from django.contrib.auth import get_user_model
from apps.core.models import State, Role

User = get_user_model()

class BasePlatformTestCase(APITestCase):
    """
    Base test case for Caregiver platform integration tests.
    Ensures seed data (states, roles, document types, courses, default superadmin)
    is available, with helper methods for token authentication.
    """

    @classmethod
    def setUpTestData(cls):
        call_command("seed_initial_data")
        cls.fl = State.objects.get(code="FL")
        cls.in_state = State.objects.get(code="IN")
        cls.ga_state = State.objects.get(code="GA")
        cls.super_role = Role.objects.get(name="super_admin")
        cls.admin_role = Role.objects.get(name="administrator")
        cls.caregiver_role = Role.objects.get(name="caregiver")
        cls.client_role = Role.objects.get(name="client")
        cls.super_user = User.objects.get(email="admin@caregiverplatform.com")

    def _login(self, email, password="password123"):
        resp = self.client.post("/api/v1/auth/token/", {"email": email, "password": password})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        token = resp.json()["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return resp.json()

    def _login_super(self):
        return self._login("admin@caregiverplatform.com", "AdminPassword123!")
