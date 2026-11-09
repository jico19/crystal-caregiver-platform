from datetime import date, timedelta
from rest_framework import status
from apps.core.test_utils import BasePlatformTestCase, User
from apps.clients.models import Client
from apps.authorizations.models import Authorization

class AuthorizationsTests(BasePlatformTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.fl_admin = User.objects.create_user(
            email="fl.admin@test.com", password="password123",
            role=cls.admin_role, state=cls.fl,
        )
        cls.in_admin = User.objects.create_user(
            email="in.admin@test.com", password="password123",
            role=cls.admin_role, state=cls.in_state,
        )
        cls.client_user = User.objects.create_user(
            email="client@test.com", password="password123",
            role=cls.client_role, state=cls.fl,
        )
        cls.client = Client.objects.create(
            id=cls.client_user, state=cls.fl,
            first_name="Owen", last_name="Grant",
            date_of_birth=date(1935, 2, 14), status="active",
            phone="555-0202",
        )
        cls.authorization = Authorization.objects.create(
            client=cls.client, state=cls.fl,
            authorization_number="AUTH-1001",
            start_date=date.today() - timedelta(days=10),
            end_date=date.today() + timedelta(days=80),
            status="pending", total_units_authorized=100,
        )

    def test_admin_authorization_review(self):
        self._login_super()
        resp = self.client.post(f"/api/v1/admin/authorizations/{self.authorization.id}/review", {"status": "approved"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["status"], "active")
        self.authorization.refresh_from_db()
        self.assertEqual(self.authorization.status, "active")

        # Invalid decision rejected
        self.authorization.status = "pending"
        self.authorization.save()
        resp = self.client.post(f"/api/v1/admin/authorizations/{self.authorization.id}/review", {"status": "banana"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Cross-state admin blocked
        self._login("in.admin@test.com")
        resp = self.client.post(f"/api/v1/admin/authorizations/{self.authorization.id}/review", {"status": "rejected"})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_cross_state_authorization_creation_blocked(self):
        in_client_user = User.objects.create_user(
            email="in.client@test.com", password="password123",
            role=self.client_role, state=self.in_state,
        )
        in_client = Client.objects.create(
            id=in_client_user, state=self.in_state,
            first_name="Indy", last_name="Client",
            date_of_birth=date(1940, 1, 1),
        )

        self._login("fl.admin@test.com")
        resp = self.client.post("/api/v1/admin/authorizations", {
            "client_id": str(in_client_user.id),
            "authorization_number": "AUTH-CROSS-01",
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=30)),
            "total_units_authorized": 50,
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        # Same state succeeds and assigns client's state
        resp_fl = self.client.post("/api/v1/admin/authorizations", {
            "client_id": str(self.client_user.id),
            "authorization_number": "AUTH-FL-01",
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=30)),
            "total_units_authorized": 50,
        })
        self.assertEqual(resp_fl.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp_fl.json()["state_id"], self.fl.id)
