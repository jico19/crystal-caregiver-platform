from datetime import date, timedelta
from types import SimpleNamespace
from unittest.mock import patch

from django.db import IntegrityError
from django.utils import timezone
from rest_framework import status

from apps.care.models import CaregiverClientAssignment
from apps.caregivers.models import Caregiver, CaregiverApplication
from apps.caregivers.services import (
    ApplicationEmailConflict,
    _is_email_unique_violation,
    compute_content_hash,
    submit_caregiver_application,
)
from apps.clients.models import Client
from apps.core.test_utils import BasePlatformTestCase, User
from apps.documents.models import DocumentType, Document
from apps.documents.test_utils import ComplianceEndpointTestCase
from apps.training.models import TrainingCourse, TrainingEnrollment


class CaregiversTests(BasePlatformTestCase):
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
        cls.cg_user = User.objects.create_user(
            email="cg@test.com",
            password="password123",
            role=cls.caregiver_role,
            state=cls.fl,
        )
        cls.caregiver = Caregiver.objects.create(
            id=cls.cg_user,
            state=cls.fl,
            first_name="Maya",
            last_name="Rivera",
            phone="555-0101",
            date_of_birth=date(1990, 5, 1),
        )
        cls.application = CaregiverApplication.objects.create(
            caregiver=cls.caregiver,
            state=cls.fl,
            status="submitted",
            signature_data="data:image/png;base64,x",
            signed_name="Maya Rivera",
            signed_at=timezone.now(),
            content_hash="abc123",
        )
        cls.doc_type = DocumentType.objects.create(
            name="CPR Certification",
            for_role="caregiver",
            requires_expiration=True,
        )
        cls.cg_doc = Document.objects.create(
            owner=cls.cg_user,
            document_type=cls.doc_type,
            state=cls.fl,
            storage_path="documents/FL/cg/cpr.pdf",
            status="approved",
            expiration_date=date.today() + timedelta(days=20),
        )
        cls.course = TrainingCourse.objects.create(
            name="OSHA Safety Training",
            validity_months=12,
        )
        cls.enrollment = TrainingEnrollment.objects.create(
            course=cls.course,
            caregiver=cls.caregiver,
            status="in_progress",
            due_at=date.today() + timedelta(days=60),
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
        cls.assignment = CaregiverClientAssignment.objects.create(
            caregiver=cls.caregiver,
            client=cls.client,
            role="primary",
            assigned_by=cls.super_user,
        )

    def _public_application_payload(self, **overrides):
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
        payload.update(overrides)
        return payload

    def _application_records(self):
        return {
            model._meta.label: list(model.objects.order_by("pk").values())
            for model in (User, Caregiver, CaregiverApplication, Client)
        }

    def _assert_public_email_rejected(self, payload):
        before = self._application_records()
        resp = self.client.post("/api/v1/caregivers/apply-public", payload)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        body = resp.json()
        self.assertEqual(
            body,
            {
                "request_id": body["request_id"],
                "status_code": 400,
                "detail": "Validation failed",
                "error_code": "VALIDATION_ERROR",
                "errors": {
                    "email": [
                        "Unable to create an application with this email."
                    ],
                },
            },
        )
        self.assertEqual(self._application_records(), before)

    def test_caregiver_apply_public_atomic(self):
        payload = self._public_application_payload(
            email="  New.Aide@EXAMPLE.COM  ",
        )
        counts = [
            model.objects.count()
            for model in (User, Caregiver, CaregiverApplication)
        ]
        resp = self.client.post("/api/v1/caregivers/apply-public", payload)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        data = resp.json()
        self.assertEqual(data["status"], "submitted")

        aide_user = User.objects.get(email="new.aide@example.com")
        self.assertNotEqual(aide_user.password, payload["password"])
        self.assertTrue(aide_user.check_password(payload["password"]))
        self.assertEqual(aide_user.role, self.caregiver_role)
        self.assertEqual(aide_user.state, self.fl)
        self.assertEqual(aide_user.status, "active")
        self.assertTrue(aide_user.is_active)
        caregiver = Caregiver.objects.get(id=aide_user)
        self.assertEqual(caregiver.state, self.fl)
        self.assertEqual(caregiver.first_name, payload["first_name"])
        self.assertEqual(caregiver.last_name, payload["last_name"])
        self.assertEqual(caregiver.phone, payload["phone"])
        self.assertEqual(caregiver.date_of_birth, date(1992, 4, 12))
        self.assertEqual(caregiver.ssn_last4, payload["ssn_last4"])
        application = CaregiverApplication.objects.get(caregiver=caregiver)
        self.assertEqual(
            data,
            {
                "application_id": str(application.id),
                "status": "submitted",
            },
        )
        self.assertEqual(application.state, self.fl)
        self.assertEqual(application.signature_data, payload["signature_data"])
        self.assertEqual(application.signed_name, payload["signed_name"])
        self.assertEqual(application.signed_at, application.submitted_at)
        self.assertEqual(application.version, 1)
        self.assertEqual(
            application.content_hash,
            compute_content_hash(
                {
                    "email": aide_user.email,
                    "first_name": payload["first_name"],
                    "last_name": payload["last_name"],
                    "state_id": self.fl.id,
                    "date_of_birth": payload["date_of_birth"],
                    "ssn_last4": payload["ssn_last4"],
                },
                payload["signed_name"],
                application.signed_at.isoformat(),
            ),
        )
        self.assertEqual(
            [
                model.objects.count()
                for model in (User, Caregiver, CaregiverApplication)
            ],
            [count + 1 for count in counts],
        )

    def test_public_application_rejects_existing_roles_unchanged(self):
        for user in (
            self.cg_user,
            self.client_user,
            self.fl_admin,
            self.super_user,
        ):
            with self.subTest(role=user.role.name):
                self._assert_public_email_rejected(
                    self._public_application_payload(
                        email=user.email,
                        state_id=self.in_state.id,
                    )
                )

    def test_public_application_rejects_email_case_variants(self):
        for email in ("CG@TEST.COM", "Cg@Test.Com", "  cg@test.com  "):
            with self.subTest(email=email):
                self._assert_public_email_rejected(
                    self._public_application_payload(email=email),
                )

    def test_public_application_rejects_historical_email_casing(self):
        # The database's exact uniqueness permits historical case
        # variants.
        User.objects.filter(pk=self.cg_user.pk).update(email="Cg@Test.COM")
        User.objects.create_user(
            email="cg@test.com",
            password="DifferentOriginalPassword123!",
            role=self.client_role,
            state=self.fl,
        )
        self._assert_public_email_rejected(
            self._public_application_payload(email="CG@test.com"),
        )

    def test_public_application_cannot_reactivate_existing_identity(self):
        variants = (
            {"status": "inactive"},
            {"status": "suspended"},
            {"is_active": False},
            {"deleted_at": timezone.now(), "deleted_by": self.super_user},
        )
        for changes in variants:
            with self.subTest(changes=changes):
                User.objects.filter(pk=self.cg_user.pk).update(
                    status="active",
                    is_active=True,
                    deleted_at=None,
                    deleted_by=None,
                )
                User.objects.filter(pk=self.cg_user.pk).update(**changes)
                self._assert_public_email_rejected(
                    self._public_application_payload(email=self.cg_user.email),
                )

    def test_public_application_repeat_preserves_first_submission(self):
        payload = self._public_application_payload()
        resp = self.client.post("/api/v1/caregivers/apply-public", payload)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self._assert_public_email_rejected(
            self._public_application_payload(
                email=payload["email"].upper(),
                password="ReplacementPassword123!",
                first_name="Changed",
                state_id=self.in_state.id,
            )
        )

    def test_public_application_service_protects_existing_identity(self):
        before = self._application_records()
        with self.assertRaises(ApplicationEmailConflict):
            submit_caregiver_application(
                self._public_application_payload(
                    email="  CG@TEST.COM  ",
                )
            )
        self.assertEqual(self._application_records(), before)

    def test_public_application_failure_rolls_back_identity_and_profile(self):
        before = self._application_records()
        create_application = CaregiverApplication.objects.create

        def fail_application_creation(**kwargs):
            self.assertTrue(
                User.objects.filter(email="new.aide@example.com").exists()
            )
            self.assertTrue(
                Caregiver.objects.filter(pk=kwargs["caregiver"].pk).exists()
            )
            # Fail after the identity and profile have been written.
            return create_application(**{**kwargs, "signature_data": None})

        with patch.object(
            CaregiverApplication.objects,
            "create",
            side_effect=fail_application_creation,
        ):
            with self.assertRaises(IntegrityError):
                submit_caregiver_application(
                    self._public_application_payload()
                )
        self.assertEqual(self._application_records(), before)

    def test_public_application_duplicate_insert_preserves_winner(self):
        # Simulate losing the race after the availability check. The
        # unique
        # violation comes from the database; this does not prove
        # concurrency.
        with patch.object(User.objects, "filter") as lookup:
            lookup.return_value.exists.return_value = False
            self._assert_public_email_rejected(
                self._public_application_payload(email="  CG@TEST.COM  "),
            )
        lookup.assert_called_once_with(email__iexact=self.cg_user.email)

    def test_public_application_unrelated_insert_error_is_not_email_conflict(
        self,
    ):
        before = self._application_records()
        create_user = User.objects.create_user

        def fail_user_creation(**kwargs):
            return create_user(**{**kwargs, "status": None})

        with patch.object(
            User.objects, "create_user", side_effect=fail_user_creation
        ):
            with self.assertRaises(IntegrityError):
                submit_caregiver_application(
                    self._public_application_payload()
                )
        self.assertEqual(self._application_records(), before)

    def test_public_application_validates_input_before_creation(self):
        before = self._application_records()
        resp = self.client.post(
            "/api/v1/caregivers/apply-public",
            self._public_application_payload(
                email="invalid", password="short"
            ),
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(resp.json()["errors"]), {"email", "password"})
        self.assertEqual(self._application_records(), before)

    def test_public_application_postgres_conflict_requires_email_constraint(
        self,
    ):
        # Exercise PostgreSQL diagnostics without claiming a production
        # race test.
        constraints = {
            "email_unique": {"unique": True, "columns": ["email"]},
            "users_pkey": {"unique": True, "columns": ["id"]},
            "email_index": {"unique": False, "columns": ["email"]},
        }
        cases = (
            ("23505", "users", "email_unique", True),
            ("23505", "users", "users_pkey", False),
            ("23505", "users", "email_index", False),
            ("23505", "users", "unknown", False),
            ("23505", "other_table", "email_unique", False),
            ("23502", "users", "email_unique", False),
        )
        with patch("apps.caregivers.services.connection") as database:
            database.vendor = "postgresql"
            database.introspection.get_constraints.return_value = constraints
            for code, table, constraint, expected in cases:
                with self.subTest(
                    code=code, table=table, constraint=constraint
                ):
                    cause = Exception("database error")
                    cause.pgcode = code
                    cause.diag = SimpleNamespace(
                        table_name=table,
                        constraint_name=constraint,
                    )
                    error = IntegrityError("insert failed")
                    error.__cause__ = cause
                    self.assertEqual(
                        _is_email_unique_violation(error), expected
                    )

    def test_admin_caregiver_documents(self):
        self._login_super()
        resp = self.client.get(
            f"/api/v1/admin/caregivers/{self.cg_user.id}/documents"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        docs = resp.json()["documents"]
        self.assertEqual(len(docs), 1)
        self.assertEqual(
            docs[0]["document_types"]["name"], "CPR Certification"
        )

        # FL admin (same state) allowed
        self._login("fl.admin@test.com")
        resp = self.client.get(
            f"/api/v1/admin/caregivers/{self.cg_user.id}/documents"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # IN admin (cross-state) blocked
        self._login("in.admin@test.com")
        resp = self.client.get(
            f"/api/v1/admin/caregivers/{self.cg_user.id}/documents"
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_caregiver_application_detail_wrapped(self):
        self._login_super()
        resp = self.client.get(
            f"/api/v1/admin/caregivers/{self.application.id}"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertIn("application", data)
        self.assertIn("enrollments", data)
        self.assertEqual(
            data["application"]["caregivers"]["id"], str(self.cg_user.id)
        )
        self.assertEqual(data["application"]["users"]["email"], "cg@test.com")
        self.assertEqual(data["application"]["states"]["code"], "FL")
        self.assertEqual(len(data["enrollments"]), 1)
        self.assertEqual(
            data["enrollments"][0]["training_courses"]["name"],
            "OSHA Safety Training",
        )

        # Cross-state admin blocked
        self._login("in.admin@test.com")
        resp = self.client.get(
            f"/api/v1/admin/caregivers/{self.application.id}"
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_caregiver_assignments(self):
        self._login_super()
        resp = self.client.get(
            f"/api/v1/admin/caregivers/{self.cg_user.id}/assignments"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        assignments = resp.json()["assignments"]
        self.assertEqual(len(assignments), 1)
        self.assertEqual(assignments[0]["clients"]["first_name"], "Owen")
        self.assertEqual(assignments[0]["caregiver_id"], str(self.cg_user.id))

        self._login("in.admin@test.com")
        resp = self.client.get(
            f"/api/v1/admin/caregivers/{self.cg_user.id}/assignments"
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class CaregiverComplianceTests(ComplianceEndpointTestCase):
    compliance_kind = "caregiver"
    clock_module = "apps.caregivers.views"
    compliance_url = "/api/v1/caregivers/me/credential-status"

    def setUp(self):
        super().setUp()
        self.compliance_owner = self.caregiver_user
        self.compliance_actor = self.caregiver_user

    def test_credential_status_characterization(self):
        self.assert_compliance_characterization()

    def test_replacement_characterization(self):
        self.assert_replacement_characterization()

    def test_requirement_and_owner_scope_characterization(self):
        self.assert_scoping_characterization()

    def test_document_state_scope_characterization(self):
        self.assert_document_state_scope_characterization()

    def test_client_cannot_access_caregiver_credential_status(self):
        self.client.force_authenticate(user=self.client_user)
        response = self.client.get(self.compliance_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_deleted_required_document_is_missing(self):
        self.assert_deleted_document_characterization()
