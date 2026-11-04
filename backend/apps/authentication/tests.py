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
