from datetime import date, timedelta
from django.utils import timezone
from rest_framework import status
from apps.core.test_utils import BasePlatformTestCase, User
from apps.caregivers.models import Caregiver, CaregiverApplication
from apps.clients.models import Client
from apps.documents.models import DocumentType, Document, DocumentRequirement
from apps.training.models import TrainingCourse, TrainingEnrollment
from apps.care.models import CaregiverClientAssignment
from apps.compliance.models import AuditLog

class CaregiversTests(BasePlatformTestCase):
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
        cls.cg_user = User.objects.create_user(
            email="cg@test.com", password="password123",
            role=cls.caregiver_role, state=cls.fl,
        )
        cls.caregiver = Caregiver.objects.create(
            id=cls.cg_user, state=cls.fl,
            first_name="Maya", last_name="Rivera",
            phone="555-0101", date_of_birth=date(1990, 5, 1),
        )
        cls.application = CaregiverApplication.objects.create(
            caregiver=cls.caregiver, state=cls.fl, status="submitted",
            signature_data="data:image/png;base64,x", signed_name="Maya Rivera",
            signed_at=timezone.now(), content_hash="abc123",
        )
        cls.doc_type = DocumentType.objects.create(
            name="CPR Certification", for_role="caregiver", requires_expiration=True,
        )
        cls.cg_doc = Document.objects.create(
            owner=cls.cg_user, document_type=cls.doc_type, state=cls.fl,
            storage_path="documents/FL/cg/cpr.pdf", status="approved",
            expiration_date=date.today() + timedelta(days=20),
        )
        cls.course = TrainingCourse.objects.create(
            name="OSHA Safety Training", validity_months=12,
        )
        cls.enrollment = TrainingEnrollment.objects.create(
            course=cls.course, caregiver=cls.caregiver,
            status="in_progress", due_at=date.today() + timedelta(days=60),
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
        cls.assignment = CaregiverClientAssignment.objects.create(
            caregiver=cls.caregiver, client=cls.client,
            role="primary", assigned_by=cls.super_user,
        )

    def test_caregiver_apply_public_atomic(self):
        payload = {
            "email": "new.aide@example.com",
            "password": "StrongPassword123!",
            "state_id": self.fl.id,
            "first_name": "Sarah",
            "last_name": "Connor",
            "phone": "407-555-9876",
            "date_of_birth": "1992-04-12",
            "ssn_last4": "1234",
            "signature_data": "data:image/png;base64,sample_signature",
            "signed_name": "Sarah Connor",
        }
        resp = self.client.post("/api/v1/caregivers/apply-public", payload)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        data = resp.json()
        self.assertEqual(data["status"], "submitted")

        self.assertTrue(User.objects.filter(email="new.aide@example.com").exists())
        aide_user = User.objects.get(email="new.aide@example.com")
        self.assertTrue(Caregiver.objects.filter(id=aide_user).exists())
        self.assertTrue(CaregiverApplication.objects.filter(caregiver__id=aide_user).exists())

    def test_admin_caregiver_documents(self):
        self._login_super()
        resp = self.client.get(f"/api/v1/admin/caregivers/{self.cg_user.id}/documents")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        docs = resp.json()["documents"]
        self.assertEqual(len(docs), 1)
        self.assertEqual(docs[0]["document_types"]["name"], "CPR Certification")

        # FL admin (same state) allowed
        self._login("fl.admin@test.com")
        resp = self.client.get(f"/api/v1/admin/caregivers/{self.cg_user.id}/documents")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # IN admin (cross-state) blocked
        self._login("in.admin@test.com")
        resp = self.client.get(f"/api/v1/admin/caregivers/{self.cg_user.id}/documents")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_caregiver_application_detail_wrapped(self):
        self._login_super()
        resp = self.client.get(f"/api/v1/admin/caregivers/{self.application.id}")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertIn("application", data)
        self.assertIn("enrollments", data)
        self.assertEqual(data["application"]["caregivers"]["id"], str(self.cg_user.id))
        self.assertEqual(data["application"]["users"]["email"], "cg@test.com")
        self.assertEqual(data["application"]["states"]["code"], "FL")
        self.assertEqual(len(data["enrollments"]), 1)
        self.assertEqual(data["enrollments"][0]["training_courses"]["name"], "OSHA Safety Training")

        # Cross-state admin blocked
        self._login("in.admin@test.com")
        resp = self.client.get(f"/api/v1/admin/caregivers/{self.application.id}")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_caregiver_assignments(self):
        self._login_super()
        resp = self.client.get(f"/api/v1/admin/caregivers/{self.cg_user.id}/assignments")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        assignments = resp.json()["assignments"]
        self.assertEqual(len(assignments), 1)
        self.assertEqual(assignments[0]["clients"]["first_name"], "Owen")
        self.assertEqual(assignments[0]["caregiver_id"], str(self.cg_user.id))

        self._login("in.admin@test.com")
        resp = self.client.get(f"/api/v1/admin/caregivers/{self.cg_user.id}/assignments")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def _application_payload(self, **updates):
        payload = {
            "email": "new.aide@example.com",
            "password": "StrongPassword123!",
            "state_id": self.fl.id,
            "first_name": "Sarah",
            "last_name": "Connor",
            "phone": "407-555-9876",
            "address": "10 Main Street",
            "date_of_birth": "1992-04-12",
            "ssn_last4": "1234",
            "notes": "CNA with weekday availability",
            "signature_data": "data:image/png;base64,sample_signature",
            "signed_name": "Sarah Connor",
        }
        payload.update(updates)
        return payload

    def _require_only_cpr(self):
        DocumentRequirement.objects.filter(state=self.fl, for_role="caregiver").delete()
        DocumentRequirement.objects.create(
            state=self.fl, document_type=self.doc_type, for_role="caregiver", required=True,
        )

    def test_public_application_cannot_change_existing_accounts(self):
        for user in [self.cg_user, self.client_user, self.fl_admin, self.super_user]:
            with self.subTest(role=user.role.name):
                original = (user.password, user.role_id, user.state_id, user.status)
                applications_before = CaregiverApplication.objects.count()
                response = self.client.post(
                    "/api/v1/caregivers/apply-public",
                    self._application_payload(email=user.email.upper(), state_id=self.in_state.id),
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                user.refresh_from_db()
                self.assertEqual((user.password, user.role_id, user.state_id, user.status), original)
                self.assertEqual(CaregiverApplication.objects.count(), applications_before)
        self.caregiver.refresh_from_db()
        self.assertEqual(self.caregiver.first_name, "Maya")

    def test_public_application_saves_address_and_experience(self):
        response = self.client.post(
            "/api/v1/caregivers/apply-public", self._application_payload(), format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        application = CaregiverApplication.objects.get(id=response.json()["application_id"])
        self.assertEqual(application.caregiver.address, "10 Main Street")
        self.assertEqual(application.notes, "CNA with weekday availability")
        self.assertEqual(len(application.content_hash), 64)
        self.assertTrue(AuditLog.objects.filter(
            action="SUBMIT_CAREGIVER_APPLICATION", record_id=str(application.pk),
        ).exists())

    def test_public_application_accepts_empty_optional_fields(self):
        response = self.client.post(
            "/api/v1/caregivers/apply-public",
            self._application_payload(phone=None, address=None, ssn_last4=None, notes=None, date_of_birth=None),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_authenticated_caregiver_can_submit_first_application_without_resetting_account(self):
        self.application.delete()
        self.client.force_authenticate(self.cg_user)
        password_before = self.cg_user.password
        response = self.client.post(
            "/api/v1/caregivers/applications/resubmit",
            self._application_payload(email=self.super_user.email), format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.cg_user.refresh_from_db()
        self.assertEqual(self.cg_user.password, password_before)
        self.assertEqual(self.cg_user.email, "cg@test.com")
        application = CaregiverApplication.objects.get(id=response.json()["application_id"])
        self.assertEqual(application.caregiver_id, self.cg_user.pk)
        self.assertEqual(application.version, 1)

    def test_public_application_invalid_state_is_validation_error(self):
        response = self.client.post(
            "/api/v1/caregivers/apply-public", self._application_payload(state_id=9999), format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="new.aide@example.com").exists())

    def test_resubmission_saves_signed_fields_and_hash(self):
        import hashlib
        import json

        self.application.status = "rejected"
        self.application.save(update_fields=["status"])
        original_application = (self.application.content_hash, self.application.signature_data)
        self.client.force_authenticate(self.cg_user)
        payload = self._application_payload(email=self.cg_user.email)
        response = self.client.post(
            "/api/v1/caregivers/applications/resubmit", payload, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.caregiver.refresh_from_db()
        self.assertEqual(self.caregiver.first_name, "Sarah")
        self.assertEqual(self.caregiver.address, "10 Main Street")
        application = CaregiverApplication.objects.get(id=response.json()["application_id"])
        self.assertEqual(application.version, 2)
        self.assertEqual(application.notes, payload["notes"])
        signed_payload = {key: value for key, value in payload.items() if key not in ("password", "signed_name")}
        canonical = json.dumps(signed_payload, sort_keys=True, separators=(',', ':'))
        expected_hash = hashlib.sha256(
            f"{canonical}{payload['signed_name']}{application.signed_at.isoformat()}".encode("utf-8")
        ).hexdigest()
        self.assertEqual(application.content_hash, expected_hash)
        self.application.refresh_from_db()
        self.assertEqual((self.application.content_hash, self.application.signature_data), original_application)
        event = AuditLog.objects.get(action="RESUBMIT_CAREGIVER_APPLICATION", record_id=str(application.pk))
        self.assertEqual(event.new_values, {"status": "submitted"})

    def test_profile_update_is_audited_without_sensitive_fields(self):
        self.client.force_authenticate(self.cg_user)
        response = self.client.patch(
            "/api/v1/caregivers/me/profile", {"phone": "555-9999", "ssn_last4": "5678"}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        event = AuditLog.objects.get(action="UPDATE_CAREGIVER_PROFILE", record_id=str(self.cg_user.pk))
        self.assertEqual(event.old_values["phone"], "555-0101")
        self.assertEqual(event.new_values["phone"], "555-9999")
        self.assertNotIn("ssn_last4", event.new_values)

    def test_resubmission_cannot_move_state_or_reset_credentials(self):
        self.application.status = "rejected"
        self.application.save(update_fields=["status"])
        original_password = self.cg_user.password
        self.client.force_authenticate(self.cg_user)
        response = self.client.post(
            "/api/v1/caregivers/applications/resubmit",
            self._application_payload(email=self.super_user.email, state_id=self.in_state.id),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.cg_user.refresh_from_db()
        self.caregiver.refresh_from_db()
        self.assertEqual(self.cg_user.password, original_password)
        self.assertEqual(self.caregiver.state_id, self.fl.id)
        self.assertEqual(self.caregiver.first_name, "Maya")

    def test_locked_application_cannot_be_resubmitted(self):
        self.client.force_authenticate(self.cg_user)
        response = self.client.post(
            "/api/v1/caregivers/applications/resubmit", self._application_payload(), format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(CaregiverApplication.objects.filter(caregiver=self.caregiver).count(), 1)

    def test_admin_compliance_rejects_expired_or_undated_required_credentials(self):
        self._require_only_cpr()
        self.client.force_authenticate(self.fl_admin)
        for expiration in (date.today() - timedelta(days=1), None):
            with self.subTest(expiration=expiration):
                self.cg_doc.expiration_date = expiration
                self.cg_doc.save(update_fields=["expiration_date"])
                response = self.client.get(f"/api/v1/admin/caregivers/{self.cg_user.id}/compliance")
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertFalse(response.json()["compliant"])
                self.assertIn(self.doc_type.name, response.json()["missing_requirements"])

    def test_renewed_document_satisfies_requirement_despite_old_expired_copy(self):
        self._require_only_cpr()
        Document.objects.create(
            owner=self.cg_user, document_type=self.doc_type, state=self.fl,
            storage_path="documents/FL/cg/old-cpr.pdf", status="approved",
            expiration_date=date.today() - timedelta(days=1),
        )
        self.client.force_authenticate(self.cg_user)
        response = self.client.get("/api/v1/caregivers/me/credential-status")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["compliant"])
        self.assertEqual(response.json()["expired"], [])

    def test_assignment_rejects_expired_required_credentials(self):
        self._require_only_cpr()
        self.cg_doc.expiration_date = date.today() - timedelta(days=1)
        self.cg_doc.save(update_fields=["expiration_date"])
        self.assignment.delete()
        self.client.force_authenticate(self.fl_admin)
        response = self.client.post(
            f"/api/v1/admin/clients/{self.client_user.id}/assignments",
            {"caregiver_id": str(self.cg_user.id)}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(self.doc_type.name, response.json()["missing_requirements"])
        self.assertFalse(CaregiverClientAssignment.objects.filter(caregiver=self.caregiver).exists())

    def test_assignment_accepts_document_valid_on_expiration_day(self):
        self._require_only_cpr()
        self.cg_doc.expiration_date = date.today()
        self.cg_doc.save(update_fields=["expiration_date"])
        self.client.force_authenticate(self.fl_admin)
        response = self.client.post(
            f"/api/v1/admin/clients/{self.client_user.id}/assignments",
            {"caregiver_id": str(self.cg_user.id)}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
