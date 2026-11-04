from rest_framework import status
from apps.core.test_utils import BasePlatformTestCase, User

class AuthenticationTests(BasePlatformTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.fl_admin = User.objects.create_user(
            email="fl.admin@test.com", password="password123",
            role=cls.admin_role, state=cls.fl,
        )

    def test_auth_token_and_me(self):
        response = self.client.post("/api/v1/auth/token/", {
            "email": "admin@caregiverplatform.com",
            "password": "AdminPassword123!",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("access", data)
        self.assertIn("refresh", data)
        self.assertEqual(data["role"], "super_admin")

        access_token = data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        me_resp = self.client.get("/api/v1/auth/me/")
        self.assertEqual(me_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(me_resp.json()["email"], "admin@caregiverplatform.com")

    def test_public_registration_blocks_admin_roles(self):
        resp_super = self.client.post("/api/v1/auth/register/", {
            "email": "hacker.admin@example.com",
            "password": "Password123!",
            "role": "super_admin",
        })
        self.assertEqual(resp_super.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", resp_super.json().get("errors", resp_super.json()))

        resp_admin = self.client.post("/api/v1/auth/register/", {
            "email": "hacker.scoped@example.com",
            "password": "Password123!",
            "role": "administrator",
        })
        self.assertEqual(resp_admin.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", resp_admin.json().get("errors", resp_admin.json()))

        resp_ok = self.client.post("/api/v1/auth/register/", {
            "email": "legit.caregiver@example.com",
            "password": "Password123!",
            "role": "caregiver",
            "state_id": self.fl.pk,
        })
        self.assertEqual(resp_ok.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp_ok.json()["role"], "caregiver")

    def test_logout_blacklists_refresh_token(self):
        resp = self.client.post("/api/v1/auth/token/", {
            "email": "fl.admin@test.com",
            "password": "password123",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        access = resp.json()["access"]
        refresh = resp.json()["refresh"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        logout_resp = self.client.post("/api/v1/auth/logout/", {"refresh": refresh})
        self.assertEqual(logout_resp.status_code, status.HTTP_200_OK)

        # Using the blacklisted refresh token now fails
        refresh_resp = self.client.post("/api/v1/auth/token/refresh/", {"refresh": refresh})
        self.assertEqual(refresh_resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_records_actor_context_without_credentials(self):
        from apps.compliance.models import AuditLog

        response = self.client.post(
            "/api/v1/auth/token/", {"email": self.fl_admin.email, "password": "password123"},
            HTTP_USER_AGENT="Workflow audit test", REMOTE_ADDR="192.0.2.10",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        event = AuditLog.objects.get(action="LOGIN", user=self.fl_admin)
        self.assertEqual(event.record_id, str(self.fl_admin.pk))
        self.assertEqual(event.entity_state_id, self.fl.id)
        self.assertEqual(event.ip_address, "192.0.2.10")
        self.assertEqual(event.user_agent, "Workflow audit test")
        self.assertIsNotNone(event.request_id)
        self.assertIsNone(event.old_values)
        self.assertIsNone(event.new_values)
        self.assertNotIn(response.json()["access"], str(event.__dict__))
        self.assertNotIn(response.json()["refresh"], str(event.__dict__))
        self.assertNotIn("password123", str(event.__dict__))

    def test_register_records_safe_account_metadata(self):
        from apps.compliance.models import AuditLog

        response = self.client.post("/api/v1/auth/register/", {
            "email": "registration-audit@example.com", "password": "Password123!",
            "role": "caregiver", "state_id": self.fl.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(pk=response.json()["id"])
        event = AuditLog.objects.get(action="REGISTER", user=user)
        self.assertEqual(event.record_id, str(user.pk))
        self.assertEqual(event.entity_state_id, self.fl.id)
        self.assertEqual(event.new_values, {
            "status": "active", "role_id": self.caregiver_role.pk, "state_id": self.fl.pk,
        })
        self.assertNotIn("Password123!", str(event.__dict__))
        self.assertNotIn("password", event.new_values)

    def test_logout_records_event_without_refresh_token(self):
        from apps.compliance.models import AuditLog

        token = self._login(self.fl_admin.email)
        response = self.client.post("/api/v1/auth/logout/", {"refresh": token["refresh"]})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        event = AuditLog.objects.get(action="LOGOUT", user=self.fl_admin)
        self.assertEqual(event.entity_state_id, self.fl.id)
        self.assertIsNone(event.new_values)
        self.assertNotIn(token["refresh"], str(event.__dict__))

    def test_invalid_auth_requests_do_not_record_success_events(self):
        from apps.compliance.models import AuditLog

        response = self.client.post("/api/v1/auth/token/", {
            "email": self.fl_admin.email, "password": "wrong-password",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(AuditLog.objects.filter(action="LOGIN").exists())
        self.client.force_authenticate(self.fl_admin)
        response = self.client.post("/api/v1/auth/logout/", {"refresh": "not-a-token"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(AuditLog.objects.filter(action="LOGOUT").exists())

    def test_caregiver_signup_login_profile_and_first_signed_application(self):
        from apps.caregivers.models import Caregiver, CaregiverApplication

        registration = self.client.post("/api/v1/auth/register/", {
            "email": "new-signup@example.com", "password": "SignupPassword123!",
            "role": "caregiver", "state_id": self.in_state.pk,
            "first_name": "New", "last_name": "Applicant", "phone": "317-555-0123",
        }, format="json")
        self.assertEqual(registration.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(pk=registration.json()["id"])
        password_before = user.password
        self.assertTrue(Caregiver.objects.filter(pk=user.pk).exists())
        self._login(user.email, "SignupPassword123!")
        profile = self.client.get("/api/v1/caregivers/me")
        self.assertEqual(profile.status_code, status.HTTP_200_OK)
        self.assertEqual(profile.json()["first_name"], "New")
        self.assertEqual(profile.json()["last_name"], "Applicant")
        self.assertEqual(profile.json()["phone"], "317-555-0123")
        self.assertEqual(profile.json()["state"], self.in_state.pk)
        self.assertIsNone(profile.json()["application_id"])
        response = self.client.post("/api/v1/caregivers/applications/resubmit", {
            "state_id": self.in_state.pk, "first_name": "New", "last_name": "Applicant",
            "phone": "317-555-0123", "date_of_birth": "1990-05-01",
            "signature_data": "data:image/png;base64,signup-signature", "signed_name": "New Applicant",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        application = CaregiverApplication.objects.get(pk=response.json()["application_id"])
        self.assertEqual(application.caregiver_id, user.pk)
        self.assertEqual(application.state_id, self.in_state.pk)
        self.assertEqual(application.version, 1)
        self.assertEqual(len(application.content_hash), 64)
        user.refresh_from_db()
        self.assertEqual(user.password, password_before)
        self.assertEqual(user.state_id, self.in_state.pk)

    def test_caregiver_signup_requires_an_active_explicit_state(self):
        self.ga_state.active = False
        self.ga_state.save(update_fields=["active"])
        for state_id in (None, 9999, self.ga_state.pk):
            with self.subTest(state_id=state_id):
                email = f"invalid-signup-state-{state_id}@example.com"
                response = self.client.post("/api/v1/auth/register/", {
                    "email": email, "password": "SignupPassword123!",
                    "role": "caregiver", "state_id": state_id,
                }, format="json")
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("state_id", response.json().get("errors", response.json()))
                self.assertFalse(User.objects.filter(email=email).exists())

    def test_public_signup_cannot_create_arbitrary_roles(self):
        from apps.core.models import Role

        response = self.client.post("/api/v1/auth/register/", {
            "email": "unexpected-role@example.com", "password": "SignupPassword123!",
            "role": "billing_owner", "state_id": self.fl.pk,
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Role.objects.filter(name="billing_owner").exists())
        self.assertFalse(User.objects.filter(email="unexpected-role@example.com").exists())

    def test_client_signup_does_not_invent_a_patient_date_of_birth(self):
        from apps.clients.models import Client

        response = self.client.post("/api/v1/auth/register/", {
            "email": "new-client-signup@example.com", "password": "SignupPassword123!", "role": "client",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(Client.objects.filter(pk=response.json()["id"]).exists())

    def test_caregiver_signup_rolls_back_account_when_profile_cannot_be_saved(self):
        from unittest.mock import patch
        from apps.authentication.serializers import UserRegisterSerializer

        serializer = UserRegisterSerializer(data={
            "email": "signup-rollback@example.com", "password": "SignupPassword123!",
            "role": "caregiver", "state_id": self.fl.pk,
            "first_name": "New", "last_name": "Applicant",
        })
        serializer.is_valid(raise_exception=True)
        with patch("apps.caregivers.models.Caregiver.objects.create", side_effect=RuntimeError("Profile save failed")):
            with self.assertRaises(RuntimeError):
                serializer.save()
        self.assertFalse(User.objects.filter(email="signup-rollback@example.com").exists())


class LogoutOwnershipTests(BasePlatformTestCase):
    def test_logout_cannot_revoke_another_users_refresh_token(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
        from apps.compliance.models import AuditLog
        other_user = User.objects.create_user(email="other-refresh-owner@example.com", role=self.caregiver_role, state=self.fl)
        token = RefreshToken.for_user(other_user)
        self.client.force_authenticate(self.super_user)
        response = self.client.post("/api/v1/auth/logout/", {"refresh": str(token)})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(BlacklistedToken.objects.filter(token__jti=token["jti"]).exists())
        self.assertFalse(AuditLog.objects.filter(action="LOGOUT").exists())
