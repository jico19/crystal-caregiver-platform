from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch
import hashlib

from rest_framework import status

from apps.care.models import CarePlan, CarePlanActivity
from apps.clients.models import Client, ClientReferral, ClientAgreement
from apps.clients.services import submit_client_intake
from apps.core.test_utils import BasePlatformTestCase, User


class ClientsTests(BasePlatformTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.fl_admin = User.objects.create_user(
            email="fl.admin@test.com",
            password="password123",
            role=cls.admin_role,
            state=cls.fl,
        )
        cls.in_admin = User.objects.create_user(
            email="in.admin@test.com",
            password="password123",
            role=cls.admin_role,
            state=cls.in_state,
        )
        cls.client_user = User.objects.create_user(
            email="client@test.com",
            password="password123",
            role=cls.client_role,
            state=cls.fl,
        )
        cls.client = Client.objects.create(
            id=cls.client_user,
            state=cls.fl,
            first_name="Owen",
            last_name="Grant",
            date_of_birth=date(1935, 2, 14),
            status="active",
            phone="555-0202",
        )
        cls.referral = ClientReferral.objects.create(
            state=cls.fl,
            first_name="Wendy",
            last_name="Hill",
            phone="555-0303",
            email="wendy@example.com",
            referral_source="Website",
            status="new",
        )

    def test_client_document_status(self):
        self._login("client@test.com")
        resp = self.client.get("/api/v1/clients/me/document-status")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        for key in (
            "summary",
            "compliant",
            "required_types",
            "missing",
            "expired",
            "expiring_soon",
        ):
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

        self._login("client@test.com")

        # 1. No care plan exists yet -> returns 200 with care_plan: null
        resp = self.client.get("/api/v1/clients/me/care-plan")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNone(resp.json()["care_plan"])

        # 2. Care plan created -> returns 200 with full plan details and
        # activity aliases
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
        self.assertEqual(
            plan_data["daily_activities"][0]["task"], "Medication reminder"
        )

    def test_client_profile_update(self):
        self._login("client@test.com")
        patch_payload = {
            "phone": "555-9999",
            "address": "789 Ocean Drive, Miami, FL",
            "medicaid_number": "FL-MED-9988",
        }
        resp = self.client.patch(
            "/api/v1/clients/me/profile", patch_payload, format="json"
        )
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
            "signature_data": (
                "data:image/png;base64,"
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk"
                "+A8AAQUBAScY42YAAAAASUVORK5CYII="
            ),
            "signed_name": "Owen Grant",
        }
        # First sign
        resp1 = self.client.post(
            "/api/v1/clients/me/agreements/general_care_terms_v1/sign",
            sign_payload,
            format="json",
        )
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp1.json()["signed"])
        self.assertEqual(resp1.json()["version"], 1)
        self.assertEqual(
            resp1.json()["title"],
            "FL Home Health Services Agreement & Patient Bill of Rights",
        )

        # Second sign (re-signing/versioning)
        resp2 = self.client.post(
            "/api/v1/clients/me/agreements/general_care_terms_v1/sign",
            sign_payload,
            format="json",
        )
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp2.json()["version"], 2)

        # GET agreements list should deduplicate to 1 entry with latest
        # version
        get_resp = self.client.get("/api/v1/clients/me/agreements")
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        agreements = get_resp.json()
        keys = [a["agreement_key"] for a in agreements]
        self.assertEqual(keys.count("general_care_terms_v1"), 1)
        self.assertTrue(agreements[0]["signed"])
        self.assertEqual(agreements[0]["version"], 2)


class ClientWorkflowTests(BasePlatformTestCase):
    signed_at = datetime(2026, 6, 15, 12, 30, tzinfo=timezone.utc)
    intake_url = "/api/v1/clients/intake"
    agreements_url = "/api/v1/clients/me/agreements"

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.owner = User.objects.create_user(
            id="00000000-0000-0000-0000-000000000006",
            email="workflow.client@example.test",
            role=cls.client_role,
            state=cls.fl,
        )

    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.owner)
        self.intake_data = {
            "first_name": "Synthetic",
            "last_name": "Client",
            "date_of_birth": "1950-01-01",
            "signature_data": "synthetic-signature",
            "signed_name": "Test Client",
        }

    def _intake(self, **overrides):
        with patch("django.utils.timezone.now", return_value=self.signed_at):
            return self.client.post(
                self.intake_url,
                {**self.intake_data, **overrides},
                format="json",
            )

    def _sign(self, key, *, timestamp=None, **overrides):
        with patch(
            "django.utils.timezone.now",
            return_value=timestamp or self.signed_at,
        ):
            return self.client.post(
                f"{self.agreements_url}/{key}/sign",
                {
                    "signature_data": "new-signature",
                    "signed_name": "Test Client",
                    **overrides,
                },
                format="json",
            )

    def test_intake_create_update_defaults_and_trusted_identity(self):
        response = self._intake(
            id=str(self.super_user.pk),
            owner=str(self.super_user.pk),
            state=self.in_state.pk,
            state_id=self.in_state.pk,
            status="active",
            signed_at="2000-01-01T00:00:00Z",
            phone="555-0100",
            address="Synthetic address",
            medicaid_number="TEST",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = Client.objects.get(pk=self.owner.pk)
        self.assertEqual(profile.state, self.fl)
        self.assertEqual(profile.status, "pending")
        self.assertEqual(profile.signed_at, self.signed_at)
        self.assertEqual(profile.signed_name, "Test Client")
        self.assertEqual(profile.signature_data, "synthetic-signature")
        self.assertEqual(profile.date_of_birth, date(1950, 1, 1))
        self.assertEqual(response.json()["id"], str(self.owner.pk))
        self.assertEqual(profile.phone, "555-0100")
        self.assertEqual(profile.address, "Synthetic address")
        self.assertEqual(profile.medicaid_number, "TEST")
        # An existing profile is reassigned to the identity's state and
        # pending.
        Client.objects.filter(pk=profile.pk).update(
            status="active",
            state=self.in_state,
        )
        response = self._intake(
            first_name="Updated", signed_name="Updated Name"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        profile.refresh_from_db()
        self.assertEqual(Client.objects.count(), 1)
        self.assertEqual(profile.first_name, "Updated")
        self.assertEqual(profile.signed_name, "Updated Name")
        self.assertEqual(profile.state, self.fl)
        self.assertEqual(profile.status, "pending")
        self.assertEqual(
            (profile.phone, profile.address, profile.medicaid_number),
            ("", "", ""),
        )

    def test_invalid_intake_and_non_client_cannot_persist(self):
        response = self._intake(date_of_birth="invalid")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        caregiver = User.objects.create_user(
            email="workflow.caregiver@example.test",
            role=self.caregiver_role,
            state=self.fl,
        )
        self.client.force_authenticate(user=caregiver)
        self.assertEqual(self._intake().status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            self._sign("care_agreement").status_code, status.HTTP_403_FORBIDDEN
        )
        self.assertFalse(Client.objects.exists())
        self.assertFalse(ClientAgreement.objects.exists())

    def test_intake_service_ignores_owner_state_and_status_overrides(self):
        profile, created = submit_client_intake(
            owner=self.owner,
            validated_data={
                **self.intake_data,
                "date_of_birth": date(1950, 1, 1),
                "id": self.super_user,
                "owner": self.super_user,
                "state": self.in_state,
                "state_id": self.in_state.pk,
                "status": "active",
            },
        )
        self.assertTrue(created)
        self.assertEqual(profile.pk, self.owner.pk)
        self.assertEqual(profile.state, self.fl)
        self.assertEqual(profile.status, "pending")

    def test_canonical_hash_versions_listing_and_historical_immutability(self):
        self._intake()
        key = "general_care_terms_v1"
        body = (
            "Standard statutory general_care_terms_v1 agreement terms for "
            f"{self.fl.name} jurisdiction."
        )
        # Spell out the pre-extraction canonical JSON, independently of
        # json.dumps.
        canonical = (
            '{"agreement_key":"general_care_terms_v1","body":"'
            + body
            + '","client_id":"00000000-0000-0000-0000-000000000006",'
            + f'"state_id":{self.fl.pk}'
            + '}'
        )
        expected_hash = hashlib.sha256(
            (canonical + "Test Client" + "2026-06-15T12:30:00+00:00").encode(
                "utf-8"
            )
        ).hexdigest()
        first = self._sign(key)
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            set(first.json()),
            {
                "id",
                "client_id",
                "state_id",
                "agreement_key",
                "title",
                "version",
                "body",
                "signed_name",
                "signed_at",
                "content_hash",
                "created_at",
                "signed",
            },
        )
        self.assertEqual(first.json()["content_hash"], expected_hash)
        self.assertEqual(first.json()["body"], body)
        self.assertEqual(
            first.json()["title"],
            "FL Home Health Services Agreement & Patient Bill of Rights",
        )
        historical = ClientAgreement.objects.values().get(
            pk=first.json()["id"]
        )
        second = self._sign(
            key,
            signed_name="Second Signature",
            timestamp=self.signed_at + timedelta(seconds=1),
        )
        self.assertEqual(second.json()["version"], 2)
        self.assertEqual(
            ClientAgreement.objects.values().get(pk=first.json()["id"]),
            historical,
        )
        # Listing selects latest creation, independently of version
        # ordering.
        older = ClientAgreement.objects.create(
            client=self.owner,
            state=self.fl,
            agreement_key="custom_terms",
            title="Historical Custom Title",
            version=9,
            body="Original legal text",
            signature_data="old-signature",
            signed_name="Original Name",
            signed_at=self.signed_at,
            content_hash="historical-hash",
        )
        snapshot = ClientAgreement.objects.values().get(pk=older.pk)
        custom = self._sign("custom_terms")
        self.assertEqual(custom.json()["title"], "Historical Custom Title")
        self.assertEqual(custom.json()["version"], 10)
        self.assertEqual(
            ClientAgreement.objects.values().get(pk=older.pk), snapshot
        )
        newest = ClientAgreement.objects.create(
            client=self.owner,
            state=self.fl,
            agreement_key="custom_terms",
            title="Latest Lower Version",
            version=1,
            body="Existing signed text",
            signature_data="other",
            signed_name="Other",
            signed_at=self.signed_at,
            content_hash="existing-hash",
        )
        listed = self.client.get(self.agreements_url).json()
        self.assertEqual(
            {row["agreement_key"]: row["id"] for row in listed},
            {
                key: second.json()["id"],
                "custom_terms": str(newest.pk),
            },
        )

    def test_title_selection_and_signing_validation(self):
        self.assertEqual(
            self._sign("care_agreement").status_code, status.HTTP_404_NOT_FOUND
        )
        self._intake()
        self.assertEqual(
            self._sign("care_agreement", signed_name="").status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        for key, expected in (
            ("care_agreement", "FL Home Care Agreement & Terms of Service"),
            (
                "hipaa_disclosure",
                "FL HIPAA Privacy Notice & Health Data Disclosure",
            ),
            ("client_rights", "FL Client Rights & Responsibilities Notice"),
            (
                "advance_directives",
                "FL Advance Directives & Healthcare Proxy Acknowledgement",
            ),
            ("unknown_terms", "Unknown Terms"),
        ):
            with self.subTest(key=key):
                legacy = ClientAgreement.objects.create(
                    client=self.owner,
                    state=self.fl,
                    agreement_key=key,
                    title="General Care Terms V1",
                    version=3,
                    body="Legacy text",
                    signature_data="old",
                    signed_name="Old",
                    signed_at=self.signed_at,
                    content_hash="unchanged",
                )
                snapshot = ClientAgreement.objects.values().get(pk=legacy.pk)
                response = self._sign(key)
                self.assertEqual(response.status_code, status.HTTP_201_CREATED)
                self.assertEqual(response.json()["title"], expected)
                self.assertEqual(response.json()["version"], 4)
                self.assertEqual(
                    ClientAgreement.objects.values().get(pk=legacy.pk),
                    snapshot,
                )
