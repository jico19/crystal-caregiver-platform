from datetime import date
from rest_framework import status
from apps.core.test_utils import BasePlatformTestCase, User
from apps.clients.models import Client, ClientReferral

class ClientsTests(BasePlatformTestCase):
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
        cls.referral = ClientReferral.objects.create(
            state=cls.fl, first_name="Wendy", last_name="Hill",
            phone="555-0303", email="wendy@example.com",
            referral_source="Website", status="new",
        )

    def test_client_document_status(self):
        self._login("client@test.com")
        resp = self.client.get("/api/v1/clients/me/document-status")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        for key in ("summary", "compliant", "required_types", "missing", "expired", "expiring_soon"):
            self.assertIn(key, data)
        self.assertIn("missing", data["summary"])
        self.assertIn("compliant", data["summary"])

    def test_admin_referrals_analytics(self):
        self._login_super()
        resp = self.client.get("/api/v1/admin/referrals/analytics")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertIn("total_referrals", data)
        self.assertIn("by_status", data)
        self.assertIn("by_source", data)
        self.assertIn("conversion_rate_pct", data)
        self.assertEqual(data["total_referrals"], 1)
        self.assertEqual(data["by_status"]["new"], 1)

        # FL admin sees only FL referral
        self._login("fl.admin@test.com")
        resp = self.client.get("/api/v1/admin/referrals/analytics")
        self.assertEqual(resp.json()["total_referrals"], 1)

        # IN admin sees zero
        self._login("in.admin@test.com")
        resp = self.client.get("/api/v1/admin/referrals/analytics")
        self.assertEqual(resp.json()["total_referrals"], 0)

    def test_client_care_plan_lifecycle(self):
        from apps.care.models import CarePlan, CarePlanActivity
        self._login("client@test.com")

        # 1. No care plan exists yet -> returns 200 with care_plan: null
        resp = self.client.get("/api/v1/clients/me/care-plan")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNone(resp.json()["care_plan"])

        # 2. Care plan created -> returns 200 with full plan details and activity aliases
        plan = CarePlan.objects.create(
            client_id=self.client_user.id,
            state=self.fl,
            primary_nurse="Supervisor RN Jane",
            emergency_protocol="Call emergency hotline",
            created_by=self.super_user,
            status="active",
        )
        CarePlanActivity.objects.create(
            care_plan=plan,
            task="Medication reminder",
            frequency="Daily",
            notes="Morning with breakfast",
            sort_order=1,
        )

        resp2 = self.client.get("/api/v1/clients/me/care-plan")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        plan_data = resp2.json()["care_plan"]
        self.assertIsNotNone(plan_data)
        self.assertEqual(plan_data["client_name"], "Owen Grant")
        self.assertEqual(plan_data["plan_status"], "active")
        self.assertEqual(len(plan_data["daily_activities"]), 1)
        self.assertEqual(plan_data["daily_activities"][0]["task"], "Medication reminder")

    def test_client_profile_update(self):
        self._login("client@test.com")
        patch_payload = {
            "phone": "555-9999",
            "address": "789 Ocean Drive, Miami, FL",
            "medicaid_number": "FL-MED-9988",
        }
        resp = self.client.patch("/api/v1/clients/me/profile", patch_payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(data["phone"], "555-9999")
        self.assertEqual(data["address"], "789 Ocean Drive, Miami, FL")
        self.assertEqual(data["medicaid_number"], "FL-MED-9988")
        self.client_user.client_profile.refresh_from_db()
        self.assertEqual(self.client_user.client_profile.phone, "555-9999")

    def test_client_agreements_signed_and_deduplication(self):
        self._login("client@test.com")
        sign_payload = {
            "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            "signed_name": "Owen Grant",
        }
        # First sign
        resp1 = self.client.post("/api/v1/clients/me/agreements/general_care_terms_v1/sign", sign_payload, format="json")
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp1.json()["signed"])
        self.assertEqual(resp1.json()["version"], 1)
        self.assertEqual(resp1.json()["title"], "FL Home Health Services Agreement & Patient Bill of Rights")

        # Second sign (re-signing/versioning)
        resp2 = self.client.post("/api/v1/clients/me/agreements/general_care_terms_v1/sign", sign_payload, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp2.json()["version"], 2)

        # GET agreements list should deduplicate to 1 entry with latest version
        get_resp = self.client.get("/api/v1/clients/me/agreements")
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        agreements = get_resp.json()
        keys = [a["agreement_key"] for a in agreements]
        self.assertEqual(keys.count("general_care_terms_v1"), 1)
        self.assertTrue(agreements[0]["signed"])
        self.assertEqual(agreements[0]["version"], 2)
