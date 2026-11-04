from datetime import date, timedelta
import hashlib
import json
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from rest_framework import status
from apps.core.test_utils import BasePlatformTestCase, User
from apps.clients.models import Client, ClientReferral, ClientAgreement
from apps.documents.models import Document, DocumentType
from apps.authorizations.models import Authorization
from apps.compliance.models import AuditLog

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
        template = self._agreement()
        sign_payload = self._signature_payload(template)
        resp1 = self.client.post("/api/v1/clients/me/agreements/general_care_terms_v1/sign", sign_payload, format="json")
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp1.json()["signed"])
        self.assertEqual(resp1.json()["version"], 1)
        self.assertEqual(resp1.json()["body"], template.body)
        self.assertEqual(resp1.json()["title"], template.title)
        self.assertTrue(AuditLog.objects.filter(action="SIGN_CLIENT_AGREEMENT", record_id=resp1.json()["id"]).exists())
        # The agency issues revised terms; signing retains that exact revision.
        revised = self._agreement(version=2, body="Agency approved revision two.")
        sign_payload = self._signature_payload(revised)
        resp2 = self.client.post("/api/v1/clients/me/agreements/general_care_terms_v1/sign", sign_payload, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp2.json()["version"], 2)
        self.assertEqual(resp2.json()["body"], revised.body)

        # GET agreements list should deduplicate to 1 entry with latest version
        get_resp = self.client.get("/api/v1/clients/me/agreements")
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        agreements = get_resp.json()
        keys = [a["agreement_key"] for a in agreements]
        self.assertEqual(keys.count("general_care_terms_v1"), 1)
        self.assertTrue(agreements[0]["signed"])
        self.assertEqual(agreements[0]["version"], 2)

    def _agreement(self, version=1, body="The exact agency supplied care terms.\nSecond paragraph."):
        return ClientAgreement.objects.create(
            client=self.client_user, state=self.fl,
            agreement_key="general_care_terms_v1", title="Agency care terms",
            version=version, body=body, signature_data="", signed_name="", content_hash="",
        )

    def _signature_payload(self, template):
        response = self.client.get("/api/v1/clients/me/agreements")
        presented = next(row for row in response.json() if row["id"] == str(template.id))
        self.assertFalse(presented["signed"])
        self.assertIsNone(presented["signed_at"])
        return {
            "agreement_id": str(template.id), "terms_hash": presented["terms_hash"],
            "signature_data": "data:image/png;base64,test-signature", "signed_name": "Owen Grant",
        }

    def test_agreement_requires_an_existing_agency_form(self):
        self._login("client@test.com")
        response = self.client.post("/api/v1/clients/me/agreements/unknown/sign", {
            "agreement_id": "00000000-0000-0000-0000-000000000001", "terms_hash": "a" * 64,
            "signature_data": "test", "signed_name": "Owen Grant",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(ClientAgreement.objects.count(), 0)

    def test_agreement_rejects_changed_terms_and_keeps_history(self):
        self._login("client@test.com")
        template = self._agreement()
        payload = self._signature_payload(template)
        template.body = "Changed after the client opened the form."
        template.save(update_fields=["body"])
        response = self.client.post("/api/v1/clients/me/agreements/general_care_terms_v1/sign", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(ClientAgreement.objects.count(), 1)

    def test_agreement_rejects_another_clients_form(self):
        self._login("client@test.com")
        template = self._agreement()
        payload = self._signature_payload(template)
        other_user = User.objects.create_user(email="other.client@test.com", role=self.client_role, state=self.fl)
        template.client = other_user
        template.save(update_fields=["client"])
        response = self.client.post("/api/v1/clients/me/agreements/general_care_terms_v1/sign", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_signed_agreement_hash_binds_the_presented_revision(self):
        self._login("client@test.com")
        template = self._agreement(version=3)
        payload = self._signature_payload(template)
        response = self.client.post("/api/v1/clients/me/agreements/general_care_terms_v1/sign", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        signed = ClientAgreement.objects.get(pk=response.json()["id"])
        canonical = json.dumps({
            "agreement_id": str(template.id), "agreement_key": template.agreement_key,
            "client_id": str(self.client_user.id), "state_id": self.fl.id,
            "title": template.title, "version": 3, "body": template.body,
        }, sort_keys=True, separators=(',', ':'))
        expected = hashlib.sha256(f"{canonical}{signed.signed_name}{signed.signed_at.isoformat()}".encode()).hexdigest()
        self.assertEqual(signed.content_hash, expected)
        template.refresh_from_db()
        self.assertEqual(template.signature_data, "")
        # A replay cannot create another signed row for already signed terms.
        replay = self.client.post("/api/v1/clients/me/agreements/general_care_terms_v1/sign", payload, format="json")
        self.assertEqual(replay.status_code, status.HTTP_409_CONFLICT)

    def test_intake_accepts_blank_optional_fields_and_preserves_admission(self):
        self._login("client@test.com")
        self.client_user.client_profile.service_start_date = date.today()
        self.client_user.client_profile.save(update_fields=["service_start_date"])
        response = self.client.post("/api/v1/clients/intake", {
            "first_name": "Owen", "last_name": "Grant", "date_of_birth": "1935-02-14",
            "phone": None, "address": None, "medicaid_number": None,
            "signature_data": "test signature", "signed_name": "Owen Grant",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["status"], "active")
        self.assertEqual(response.json()["service_start_date"], str(date.today()))
        self.assertTrue(AuditLog.objects.filter(action="SUBMIT_CLIENT_INTAKE").exists())

    def _authorization_document(self, **overrides):
        document_type, _ = DocumentType.objects.get_or_create(name="Authorizations", defaults={"for_role": "client"})
        path = default_storage.save(f"test-authorizations/{self._testMethodName}.pdf", ContentFile(b"%PDF-1.4\nletter"))
        self.addCleanup(default_storage.delete, path)
        values = dict(owner=self.client_user, state=self.fl, document_type=document_type, storage_path=path)
        values.update(overrides)
        return Document.objects.create(**values)

    def _authorization_payload(self, document):
        return {
            "authorization_number": "PAYER-1234", "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=30)), "document": str(document.id),
            "status": "active", "total_units_authorized": 100,
        }

    def test_client_authorization_links_uploaded_file_and_stays_pending(self):
        self._login("client@test.com")
        document = self._authorization_document()
        response = self.client.post("/api/v1/clients/me/authorizations", self._authorization_payload(document), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["document_id"], str(document.id))
        self.assertEqual(response.json()["source"], "client")
        self.assertEqual(response.json()["status"], "pending")
        self.assertTrue(AuditLog.objects.filter(action="SUBMIT_CLIENT_AUTHORIZATION").exists())

    def test_client_authorization_rejects_other_owner_or_state_document(self):
        self._login("client@test.com")
        for overrides in ({"owner": self.super_user}, {"state": self.in_state}):
            with self.subTest(overrides=overrides):
                document = self._authorization_document(**overrides)
                response = self.client.post("/api/v1/clients/me/authorizations", self._authorization_payload(document), format="json")
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Authorization.objects.count(), 0)

    def test_client_authorization_rejects_missing_deleted_or_unuploaded_document(self):
        self._login("client@test.com")
        document = self._authorization_document()
        payload = self._authorization_payload(document)
        payload.pop("document")
        self.assertEqual(self.client.post("/api/v1/clients/me/authorizations", payload, format="json").status_code, 400)
        default_storage.delete(document.storage_path)
        self.assertEqual(self.client.post("/api/v1/clients/me/authorizations", self._authorization_payload(document), format="json").status_code, 400)
        document = self._authorization_document()
        document.soft_delete(self.super_user)
        self.assertEqual(self.client.post("/api/v1/clients/me/authorizations", self._authorization_payload(document), format="json").status_code, 400)

    def test_client_authorization_rejects_invalid_coverage_dates(self):
        self._login("client@test.com")
        document = self._authorization_document()
        payload = self._authorization_payload(document)
        payload["end_date"] = str(date.today() - timedelta(days=1))
        response = self.client.post("/api/v1/clients/me/authorizations", payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_authorization_letter_upload_reaches_admin_review_with_its_file(self):
        self._login("client@test.com")
        document_type, _ = DocumentType.objects.get_or_create(name="Authorizations", defaults={"for_role": "client"})
        intent = self.client.post("/api/v1/documents/upload-intent", {
            "document_type_id": document_type.id, "filename": "payer-letter.pdf", "content_type": "application/pdf",
        }, format="json")
        self.assertEqual(intent.status_code, 200)
        uploaded = self.client.put(intent.json()["upload_url"], b"%PDF-1.4\nExample approval letter", content_type="application/pdf")
        self.assertEqual(uploaded.status_code, 200)
        document = Document.objects.get(pk=intent.json()["document_id"])
        self.addCleanup(default_storage.delete, document.storage_path)
        created = self.client.post("/api/v1/clients/me/authorizations", self._authorization_payload(document), format="json")
        self.assertEqual(created.status_code, 201)
        self._login("fl.admin@test.com")
        queue = self.client.get("/api/v1/admin/authorizations")
        self.assertEqual(queue.status_code, 200)
        row = next(row for row in queue.json()["results"] if row["id"] == created.json()["id"])
        self.assertEqual(row["status"], "pending")
        self.assertEqual(row["document_id"], str(document.id))

    def test_client_authorization_cannot_link_a_different_document_category(self):
        self._login("client@test.com")
        document = self._authorization_document(document_type=DocumentType.objects.get(name="Medicaid Card"))
        response = self.client.post("/api/v1/clients/me/authorizations", self._authorization_payload(document), format="json")
        self.assertEqual(response.status_code, 400)

    def test_client_can_submit_letter_without_identifying_a_payer_number(self):
        self._login("client@test.com")
        document = self._authorization_document()
        payload = self._authorization_payload(document)
        payload.pop("authorization_number")
        response = self.client.post("/api/v1/clients/me/authorizations", payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["authorization_number"], "")
        self.assertEqual(response.json()["status"], "pending")
