from datetime import date, timedelta
from django.utils import timezone
from rest_framework import status
from apps.core.test_utils import BasePlatformTestCase, User
from apps.caregivers.models import Caregiver, CaregiverApplication
from apps.clients.models import Client
from apps.documents.models import DocumentType, Document
from apps.training.models import TrainingCourse, TrainingEnrollment
from apps.care.models import CaregiverClientAssignment

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
