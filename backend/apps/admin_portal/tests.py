from datetime import date
from unittest.mock import patch
from uuid import UUID, uuid4

from django.utils import timezone
from rest_framework import status

from apps.caregivers.models import Caregiver, CaregiverApplication
from apps.clients.models import Client
from apps.compliance.models import AuditLog
from apps.core.test_utils import BasePlatformTestCase, User
from apps.documents.test_utils import ComplianceEndpointTestCase


class AdminPortalTests(BasePlatformTestCase):
    def test_admin_dashboard_metrics(self):
        login_resp = self.client.post(
            "/api/v1/auth/token/",
            {
                "email": "admin@caregiverplatform.com",
                "password": "AdminPassword123!",
            },
        )
        token = login_resp.json()["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        dash_resp = self.client.get("/api/v1/admin/dashboard")
        self.assertEqual(dash_resp.status_code, status.HTTP_200_OK)
        dash_data = dash_resp.json()
        self.assertIn("active_caregivers", dash_data)
        self.assertIn("active_clients", dash_data)
        self.assertIn("announcements", dash_data)
        self.assertIn("metrics", dash_data)

    def test_application_review_and_legal_hold_audit_logging(self):

        self._login_super()

        cg_user = User.objects.create_user(
            email="cg_audit_test@example.com",
            password="password123",
            role=self.caregiver_role,
            state=self.fl,
        )
        cg = Caregiver.objects.create(
            id=cg_user, state=self.fl, first_name="Audit", last_name="Cg"
        )
        app = CaregiverApplication.objects.create(
            caregiver=cg,
            state=self.fl,
            status="submitted",
            signed_name="Audit Cg",
            signed_at=timezone.now(),
            content_hash="abc",
        )

        rev_resp = self.client.post(
            f"/api/v1/admin/caregivers/{app.id}/review",
            {"status": "approved", "notes": "Verified credentials"},
        )
        self.assertEqual(rev_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(
            AuditLog.objects.filter(
                action="REVIEW_CAREGIVER_APPLICATION", record_id=str(app.id)
            ).exists()
        )

        hold_resp = self.client.patch(
            f"/api/v1/admin/caregivers/{cg_user.id}/legal-hold"
        )
        self.assertEqual(hold_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(
            AuditLog.objects.filter(
                action="TOGGLE_LEGAL_HOLD", record_id=str(cg_user.id)
            ).exists()
        )


class AdminActionTestCase(BasePlatformTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.fl_admin = User.objects.create_user(
            email="action.fl.admin@example.com",
            password="password123",
            role=cls.admin_role,
            state=cls.fl,
        )
        cls.in_admin = User.objects.create_user(
            email="action.in.admin@example.com",
            password="password123",
            role=cls.admin_role,
            state=cls.in_state,
        )
        cls.unassigned_admin = User.objects.create_user(
            email="action.unassigned.admin@example.com",
            password="password123",
            role=cls.admin_role,
        )

    def _action_records(self):
        models = (User, Client, Caregiver, CaregiverApplication, AuditLog)
        return {
            model._meta.label: list(model.objects.order_by("pk").values())
            for model in models
        }

    def _assert_action_rejected(
        self,
        payload,
        expected_status,
        *,
        actor,
        url=None,
        field=None,
    ):
        self.client.force_authenticate(user=actor)
        before = self._action_records()
        response = self.client.post(url or self.url, payload, format="json")
        self.assertEqual(response.status_code, expected_status)
        if field:
            self.assertEqual(set(response.json()["errors"]), {field})
        self.assertEqual(self._action_records(), before)


class ClientAdmissionTests(AdminActionTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.client_user = User.objects.create_user(
            email="admission.client@example.com",
            password="password123",
            role=cls.client_role,
            state=cls.fl,
        )
        cls.client_record = Client.objects.create(
            id=cls.client_user,
            state=cls.fl,
            first_name="Synthetic",
            last_name="Client",
            date_of_birth=date(1950, 1, 2),
            status="pending",
            service_start_date=date(2026, 1, 1),
            admission_notes="Previous admission notes",
            rejection_reason="Previous rejection reason",
            admitted_by=cls.in_admin,
            admitted_at=timezone.now(),
        )
        cls.url = f"/api/v1/admin/clients/{cls.client_user.pk}/admission"

    def test_admission_defaults_preserve_response_and_audit_contract(self):
        for actor in (self.fl_admin, self.super_user):
            with self.subTest(actor=actor.role.name):
                self.client.force_authenticate(user=actor)
                old_status = self.client_record.status
                before = timezone.now()
                audit_count = AuditLog.objects.count()
                response = self.client.post(
                    self.url,
                    {},
                    format="json",
                    HTTP_X_FORWARDED_FOR="203.0.113.10, 203.0.113.11",
                    HTTP_USER_AGENT="Synthetic admission test",
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.client_record.refresh_from_db()
                record = self.client_record
                self.assertEqual(record.status, "approved")
                self.assertIsNone(record.service_start_date)
                self.assertEqual(record.admission_notes, "")
                self.assertEqual(record.rejection_reason, "")
                self.assertEqual(record.admitted_by, actor)
                self.assertGreaterEqual(record.admitted_at, before)
                self.assertLessEqual(record.admitted_at, timezone.now())
                body = response.json()
                self.assertEqual(
                    set(body),
                    {
                        "id",
                        "email",
                        "state_id",
                        "state_code",
                        "first_name",
                        "last_name",
                        "date_of_birth",
                        "phone",
                        "address",
                        "medicaid_number",
                        "status",
                        "service_start_date",
                        "admitted_at",
                        "admission_notes",
                        "rejection_reason",
                        "signed_name",
                        "signed_at",
                        "legal_hold",
                        "created_at",
                        "updated_at",
                    },
                )
                self.assertEqual(body["id"], str(record.pk))
                self.assertEqual(body["email"], self.client_user.email)
                self.assertEqual(body["state_code"], "FL")
                self.assertEqual(body["date_of_birth"], "1950-01-02")
                self.assertEqual(body["status"], "approved")
                self.assertIsNone(body["service_start_date"])
                self.assertEqual(body["admission_notes"], "")
                self.assertEqual(body["rejection_reason"], "")
                self.assertEqual(
                    body["admitted_at"],
                    record.admitted_at.isoformat().replace("+00:00", "Z"),
                )
                self.assertEqual(AuditLog.objects.count(), audit_count + 1)
                log = AuditLog.objects.filter(record_id=str(record.pk)).first()
                self.assertEqual(log.action, "ADMIT_CLIENT")
                self.assertEqual(log.table_name, "clients")
                self.assertEqual(log.user, actor)
                self.assertEqual(log.entity_state, self.fl)
                self.assertEqual(log.old_values, {"status": old_status})
                self.assertEqual(
                    log.new_values,
                    {
                        "status": "approved",
                        "service_start_date": None,
                        "rejection_reason": "",
                    },
                )
                self.assertEqual(log.ip_address, "203.0.113.10")
                self.assertEqual(log.user_agent, "Synthetic admission test")
                self.assertIsInstance(log.request_id, UUID)

    def test_admission_accepts_all_existing_statuses_and_nullable_text(self):
        self.client.force_authenticate(user=self.super_user)
        for target_status, _ in Client.STATUS_CHOICES:
            with self.subTest(status=target_status):
                old_status = self.client_record.status
                response = self.client.post(
                    self.url,
                    {
                        "status": target_status,
                        "service_start_date": "2026-12-01",
                        "admission_notes": "  Synthetic admission notes  ",
                        "rejection_reason": None,
                    },
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.client_record.refresh_from_db()
                self.assertEqual(self.client_record.status, target_status)
                self.assertEqual(
                    self.client_record.service_start_date,
                    date(2026, 12, 1),
                )
                self.assertEqual(
                    self.client_record.admission_notes,
                    "  Synthetic admission notes  ",
                )
                self.assertIsNone(self.client_record.rejection_reason)
                self.assertEqual(
                    response.json()["service_start_date"],
                    "2026-12-01",
                )
                log = AuditLog.objects.filter(
                    record_id=str(self.client_record.pk),
                ).first()
                self.assertEqual(
                    log.action,
                    (
                        "ADMIT_CLIENT"
                        if target_status in ("approved", "active")
                        else "REJECT_CLIENT"
                    ),
                )
                self.assertEqual(log.old_values, {"status": old_status})
                self.assertEqual(
                    log.new_values,
                    {
                        "status": target_status,
                        "service_start_date": "2026-12-01",
                        "rejection_reason": None,
                    },
                )

        response = self.client.post(
            self.url,
            {
                "service_start_date": None,
                "admission_notes": None,
                "rejection_reason": "",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client_record.refresh_from_db()
        self.assertIsNone(self.client_record.service_start_date)
        self.assertIsNone(self.client_record.admission_notes)
        self.assertEqual(self.client_record.rejection_reason, "")

    def test_admission_rejects_invalid_fields_without_writes(self):
        cases = {
            "status": [None, "unknown", "", [], {}, True, 123],
            "service_start_date": [
                "not-a-date",
                "2026-02-30",
                "",
                [],
                {},
                True,
                123,
            ],
            "admission_notes": [[], {}, True, 123],
            "rejection_reason": [[], {}, True, 123],
        }
        for field, values in cases.items():
            for value in values:
                with self.subTest(field=field, value=value):
                    self._assert_action_rejected(
                        {field: value},
                        status.HTTP_400_BAD_REQUEST,
                        actor=self.super_user,
                        field=field,
                    )

    def test_admission_permissions_reject_without_writes(self):
        for actor, expected in (
            (None, status.HTTP_401_UNAUTHORIZED),
            (self.client_user, status.HTTP_403_FORBIDDEN),
            (self.in_admin, status.HTTP_403_FORBIDDEN),
            (self.unassigned_admin, status.HTTP_403_FORBIDDEN),
        ):
            with self.subTest(actor=actor):
                # Authorization must still run before input validation.
                self._assert_action_rejected(
                    {"status": "unknown"},
                    expected,
                    actor=actor,
                )

    def test_admission_missing_and_deleted_targets_remain_not_found(self):
        self._assert_action_rejected(
            {},
            status.HTTP_404_NOT_FOUND,
            actor=self.super_user,
            url=f"/api/v1/admin/clients/{uuid4()}/admission",
        )
        self.client_record.soft_delete(user=self.super_user)
        self._assert_action_rejected(
            {},
            status.HTTP_404_NOT_FOUND,
            actor=self.super_user,
        )

    def test_admission_rolls_back_when_required_audit_returns_none(self):
        self.client.force_authenticate(user=self.super_user)
        before = self._action_records()
        with patch(
            "apps.clients.services.record_audit_log",
            return_value=None,
        ):
            with self.assertRaisesRegex(
                RuntimeError,
                "required client admission audit",
            ):
                self.client.post(self.url, {"status": "active"}, format="json")
        self.assertEqual(self._action_records(), before)

    def test_admission_rolls_back_when_audit_insert_fails(self):
        self.client.force_authenticate(user=self.super_user)
        before = self._action_records()
        create_log = AuditLog.objects.create
        observed_statuses = []

        def fail_audit_insert(**kwargs):
            observed_statuses.append(
                Client.objects.get(pk=self.client_record.pk).status,
            )
            return create_log(**{**kwargs, "action": None})

        with patch.object(
            AuditLog.objects,
            "create",
            side_effect=fail_audit_insert,
        ):
            with self.assertLogs("apps.compliance.audit", level="ERROR"):
                with self.assertRaisesRegex(
                    RuntimeError,
                    "required client admission audit",
                ):
                    self.client.post(
                        self.url,
                        {"status": "active"},
                        format="json",
                    )
        self.assertEqual(observed_statuses, ["active"])
        self.assertEqual(self._action_records(), before)


class CaregiverApplicationReviewTests(AdminActionTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.caregiver_user = User.objects.create_user(
            email="review.caregiver@example.com",
            password="password123",
            role=cls.caregiver_role,
            state=cls.fl,
        )
        cls.caregiver = Caregiver.objects.create(
            id=cls.caregiver_user,
            state=cls.fl,
            first_name="Synthetic",
            last_name="Caregiver",
        )
        cls.application = CaregiverApplication.objects.create(
            caregiver=cls.caregiver,
            state=cls.fl,
            status="submitted",
            notes="Previous review notes",
            rejection_reason="Previous reason",
            reviewed_by=cls.in_admin,
            reviewed_at=timezone.now(),
            signature_data="synthetic-signature",
            signed_name="Synthetic Caregiver",
            signed_at=timezone.now(),
            content_hash="synthetic-content-hash",
        )
        cls.url = f"/api/v1/admin/caregivers/{cls.application.pk}/review"

    def test_review_defaults_preserve_response_and_audit_contract(self):
        for actor in (self.fl_admin, self.super_user):
            with self.subTest(actor=actor.role.name):
                self.client.force_authenticate(user=actor)
                old_status = self.application.status
                before = timezone.now()
                audit_count = AuditLog.objects.count()
                response = self.client.post(
                    self.url,
                    {"status": "approved"},
                    format="json",
                    HTTP_X_FORWARDED_FOR="203.0.113.10, 203.0.113.11",
                    HTTP_USER_AGENT="Synthetic review test",
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.application.refresh_from_db()
                app = self.application
                self.assertEqual(app.status, "approved")
                self.assertEqual(app.notes, "")
                self.assertIsNone(app.rejection_reason)
                self.assertEqual(app.reviewed_by, actor)
                self.assertGreaterEqual(app.reviewed_at, before)
                self.assertLessEqual(app.reviewed_at, timezone.now())
                body = response.json()
                self.assertEqual(
                    set(body),
                    {
                        "id",
                        "caregiver_id",
                        "first_name",
                        "last_name",
                        "state_id",
                        "state_code",
                        "status",
                        "submitted_at",
                        "reviewed_at",
                        "notes",
                        "rejection_reason",
                        "signature_data",
                        "signed_name",
                        "signed_at",
                        "version",
                        "content_hash",
                    },
                )
                self.assertEqual(body["id"], str(app.pk))
                self.assertEqual(body["caregiver_id"], str(self.caregiver.pk))
                self.assertEqual(body["state_code"], "FL")
                self.assertEqual(body["status"], "approved")
                self.assertEqual(body["notes"], "")
                self.assertIsNone(body["rejection_reason"])
                self.assertEqual(
                    body["reviewed_at"],
                    app.reviewed_at.isoformat().replace("+00:00", "Z"),
                )
                self.assertEqual(body["signature_data"], "synthetic-signature")
                self.assertEqual(
                    body["content_hash"],
                    "synthetic-content-hash",
                )
                self.assertEqual(AuditLog.objects.count(), audit_count + 1)
                log = AuditLog.objects.filter(record_id=str(app.pk)).first()
                self.assertEqual(log.action, "REVIEW_CAREGIVER_APPLICATION")
                self.assertEqual(log.table_name, "caregiver_applications")
                self.assertEqual(log.user, actor)
                self.assertEqual(log.entity_state, self.fl)
                self.assertEqual(log.old_values, {"status": old_status})
                self.assertEqual(
                    log.new_values,
                    {
                        "status": "approved",
                        "notes": "",
                        "rejection_reason": None,
                    },
                )
                self.assertEqual(log.ip_address, "203.0.113.10")
                self.assertEqual(log.user_agent, "Synthetic review test")
                self.assertIsInstance(log.request_id, UUID)

    def test_review_accepts_existing_statuses_without_transition_rules(self):
        self.client.force_authenticate(user=self.super_user)
        statuses = ("rejected", "under_review", "onboarding", "approved")
        for target_status in statuses:
            with self.subTest(status=target_status):
                old_status = self.application.status
                response = self.client.post(
                    self.url,
                    {
                        "status": target_status,
                        "notes": "  Synthetic review notes  ",
                        "rejection_reason": "",
                    },
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.application.refresh_from_db()
                self.assertEqual(self.application.status, target_status)
                self.assertEqual(
                    self.application.notes,
                    "  Synthetic review notes  ",
                )
                self.assertEqual(self.application.rejection_reason, "")
                log = AuditLog.objects.filter(
                    record_id=str(self.application.pk),
                ).first()
                self.assertEqual(log.old_values, {"status": old_status})
                self.assertEqual(
                    log.new_values,
                    {
                        "status": target_status,
                        "notes": "  Synthetic review notes  ",
                        "rejection_reason": "",
                    },
                )

    def test_review_requires_status_without_writes(self):
        self._assert_action_rejected(
            {},
            status.HTTP_400_BAD_REQUEST,
            actor=self.super_user,
            field="status",
        )

    def test_review_rejects_invalid_fields_without_writes(self):
        cases = {
            "status": [None, "unknown", "submitted", "", [], {}, True, 123],
            "notes": [None, [], {}, True, 123],
            "rejection_reason": [[], {}, True, 123],
        }
        for field, values in cases.items():
            for value in values:
                with self.subTest(field=field, value=value):
                    self._assert_action_rejected(
                        {"status": "approved", field: value},
                        status.HTTP_400_BAD_REQUEST,
                        actor=self.super_user,
                        field=field,
                    )

    def test_review_permissions_reject_without_writes(self):
        for actor, expected in (
            (None, status.HTTP_401_UNAUTHORIZED),
            (self.caregiver_user, status.HTTP_403_FORBIDDEN),
            (self.in_admin, status.HTTP_403_FORBIDDEN),
            (self.unassigned_admin, status.HTTP_403_FORBIDDEN),
        ):
            with self.subTest(actor=actor):
                self._assert_action_rejected(
                    {"status": "unknown"},
                    expected,
                    actor=actor,
                )

    def test_review_missing_and_deleted_targets_remain_not_found(self):
        self._assert_action_rejected(
            {"status": "approved"},
            status.HTTP_404_NOT_FOUND,
            actor=self.super_user,
            url=f"/api/v1/admin/caregivers/{uuid4()}/review",
        )
        self.application.soft_delete(user=self.super_user)
        self._assert_action_rejected(
            {"status": "approved"},
            status.HTTP_404_NOT_FOUND,
            actor=self.super_user,
        )

    def test_review_rolls_back_when_required_audit_returns_none(self):
        self.client.force_authenticate(user=self.super_user)
        before = self._action_records()
        with patch(
            "apps.caregivers.services.record_audit_log",
            return_value=None,
        ):
            with self.assertRaisesRegex(
                RuntimeError,
                "required caregiver review audit",
            ):
                self.client.post(
                    self.url,
                    {"status": "approved"},
                    format="json",
                )
        self.assertEqual(self._action_records(), before)

    def test_review_rolls_back_when_audit_insert_fails(self):
        self.client.force_authenticate(user=self.super_user)
        before = self._action_records()
        create_log = AuditLog.objects.create
        observed_statuses = []

        def fail_audit_insert(**kwargs):
            observed_statuses.append(
                CaregiverApplication.objects.get(
                    pk=self.application.pk,
                ).status,
            )
            return create_log(**{**kwargs, "action": None})

        with patch.object(
            AuditLog.objects,
            "create",
            side_effect=fail_audit_insert,
        ):
            with self.assertLogs("apps.compliance.audit", level="ERROR"):
                with self.assertRaisesRegex(
                    RuntimeError,
                    "required caregiver review audit",
                ):
                    self.client.post(
                        self.url,
                        {"status": "approved"},
                        format="json",
                    )
        self.assertEqual(observed_statuses, ["approved"])
        self.assertEqual(self._action_records(), before)


class AdminCaregiverComplianceTests(ComplianceEndpointTestCase):
    compliance_kind = "admin"
    clock_module = "apps.admin_portal.views"

    def setUp(self):
        super().setUp()
        self.compliance_owner = self.caregiver_user
        self.compliance_actor = self.super_user
        self.compliance_url = (
            f"/api/v1/admin/caregivers/{self.caregiver.pk}/compliance"
        )

    def test_admin_compliance_characterization(self):
        self.assert_compliance_characterization()

    def test_replacement_characterization(self):
        self.assert_replacement_characterization()

    def test_requirement_and_owner_scope_characterization(self):
        self.assert_scoping_characterization()

    def test_document_state_scope_characterization(self):
        self.assert_document_state_scope_characterization()

    def test_deleted_required_document_is_missing(self):
        self.assert_deleted_document_characterization()

    def test_state_admin_boundary_is_preserved(self):
        self.compliance_actor = self.fl_admin
        self.assertEqual(
            self._get_compliance(),
            self._expected_compliance(
                missing=[self.required_type.name],
            ),
        )
        for actor in (self.in_admin, self.caregiver_user, self.client_user):
            with self.subTest(actor=actor):
                self.client.force_authenticate(user=actor)
                before = self._compliance_records()
                response = self.client.get(self.compliance_url)
                self.assertEqual(
                    response.status_code, status.HTTP_403_FORBIDDEN
                )
                self.assertEqual(self._compliance_records(), before)
