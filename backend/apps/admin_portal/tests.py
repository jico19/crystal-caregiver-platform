from rest_framework import status
from apps.core.test_utils import BasePlatformTestCase, User


class AdminPortalTests(BasePlatformTestCase):
    def test_admin_dashboard_metrics(self):
        login_resp = self.client.post("/api/v1/auth/token/", {
            "email": "admin@caregiverplatform.com",
            "password": "AdminPassword123!",
        })
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
        from apps.compliance.models import AuditLog
        from apps.caregivers.models import Caregiver, CaregiverApplication
        from django.utils import timezone

        self._login_super()

        cg_user = User.objects.create_user(
            email="cg_audit_test@example.com", password="password123",
            role=self.caregiver_role, state=self.fl
        )
        cg = Caregiver.objects.create(id=cg_user, state=self.fl, first_name="Audit", last_name="Cg")
        app = CaregiverApplication.objects.create(
            caregiver=cg, state=self.fl, status="submitted",
            signed_name="Audit Cg", signed_at=timezone.now(), content_hash="abc"
        )

        rev_resp = self.client.post(f"/api/v1/admin/caregivers/{app.id}/review", {
            "status": "approved",
            "notes": "Verified credentials"
        })
        self.assertEqual(rev_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(
            AuditLog.objects.filter(action="REVIEW_CAREGIVER_APPLICATION", record_id=str(app.id)).exists()
        )

        hold_resp = self.client.patch(f"/api/v1/admin/caregivers/{cg_user.id}/legal-hold")
        self.assertEqual(hold_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(
            AuditLog.objects.filter(action="TOGGLE_LEGAL_HOLD", record_id=str(cg_user.id)).exists()
        )


class ReportWorkflowTests(BasePlatformTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        from datetime import date, timedelta
        from apps.caregivers.models import Caregiver
        from apps.clients.models import Client, ClientReferral
        from apps.documents.models import Document, DocumentType
        from apps.training.models import TrainingCourse, TrainingEnrollment
        from apps.authorizations.models import Authorization

        cls.regional = User.objects.create_user(
            email="report-admin@example.com", role=cls.admin_role, state=cls.fl,
        )
        cls.caregiver_user = User.objects.create_user(
            email="report-caregiver@example.com", role=cls.caregiver_role, state=cls.fl,
        )
        caregiver = Caregiver.objects.create(
            id=cls.caregiver_user, state=cls.fl, first_name="Report", last_name="Caregiver",
        )
        Document.objects.create(
            owner=cls.caregiver_user, state=cls.fl,
            document_type=DocumentType.objects.get(name="CPR Certificate"),
            status="approved", expiration_date=date.today() - timedelta(days=1),
            storage_path="reports/expired.pdf",
        )
        TrainingEnrollment.objects.create(
            caregiver=caregiver, course=TrainingCourse.objects.first(), status="completed",
        )
        patient = User.objects.create_user(
            email="report-client@example.com", role=cls.client_role, state=cls.fl,
        )
        client = Client.objects.create(
            id=patient, state=cls.fl, first_name="Report", last_name="Client",
            date_of_birth=date(1960, 1, 1),
        )
        Authorization.objects.create(
            client=client, state=cls.fl, authorization_number="REPORT-FL-001",
            start_date=date.today() - timedelta(days=1), end_date=date.today() + timedelta(days=10),
            status="active",
        )
        cls.inquiry = ClientReferral.objects.create(
            state=cls.fl, first_name="Website", last_name="Lead", phone="555-0100",
            referral_source="Website",
        )
        ClientReferral.objects.create(
            state=cls.in_state, first_name="Outside", last_name="State", phone="555-0101",
            referral_source="Hospital",
        )

    def test_reports_supply_all_six_sections_and_real_records(self):
        self.client.force_authenticate(self.super_user)
        response = self.client.get("/api/v1/admin/reports")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIsInstance(data, dict)
        for section in (
            "caregiver_compliance", "expiring_credentials", "training_completion",
            "client_authorizations", "referral_sources", "website_inquiries",
        ):
            self.assertIn(section, data)
        compliance = data["caregiver_compliance"]["rows"][0]
        self.assertFalse(compliance["compliant"])
        self.assertIn("CPR Certificate", compliance["missing_names"])
        self.assertEqual(compliance["expired"], 1)
        self.assertEqual(data["expiring_credentials"]["rows"][0]["status"], "expired")
        self.assertEqual(data["training_completion"]["rows"][0]["completed"], 1)
        self.assertEqual(data["client_authorizations"]["summary"]["expiring_soon"], 1)
        self.assertEqual(data["referral_sources"]["total"], 2)
        self.assertEqual(data["website_inquiries"]["total"], 1)

    def test_regional_reports_cannot_include_other_states(self):
        self.client.force_authenticate(self.regional)
        response = self.client.get("/api/v1/admin/reports?state=indiana")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIsInstance(data, dict)
        self.assertEqual(data["referral_sources"]["total"], 1)
        for key in ("caregiver_compliance", "expiring_credentials", "client_authorizations"):
            self.assertTrue(all(row["state_code"] == "FL" for row in data[key]["rows"]))

    def test_reports_deny_unassigned_admin_and_caregiver(self):
        unassigned = User.objects.create_user(email="unassigned-report@example.com", role=self.admin_role)
        for user in (unassigned, self.caregiver_user):
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get("/api/v1/admin/reports").status_code, status.HTTP_403_FORBIDDEN)


    def test_website_inquiry_report_keeps_referrer_relationship(self):
        response = self.client.post("/api/v1/states/florida/contact/", {
            "first_name": "New", "last_name": "Family", "phone": "555-0102",
            "referral_source": "Family Member", "notes": "Looking for care",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.client.force_authenticate(self.super_user)
        data = self.client.get("/api/v1/admin/reports").json()
        self.assertEqual(data["website_inquiries"]["total"], 2)
        self.assertTrue(any(row["source"] == "Family Member" for row in data["referral_sources"]["rows"]))


class ApplicantQueueTests(BasePlatformTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        from datetime import timedelta
        from django.utils import timezone
        from apps.caregivers.models import Caregiver, CaregiverApplication

        cls.fl_admin = User.objects.create_user(
            email="queue-admin@example.com", role=cls.admin_role, state=cls.fl,
        )
        cls.with_application = User.objects.create_user(
            email="queue-applicant@example.com", role=cls.caregiver_role, state=cls.fl,
        )
        caregiver = Caregiver.objects.create(
            id=cls.with_application, state=cls.fl, first_name="Queue", last_name="Applicant",
        )
        CaregiverApplication.objects.create(
            caregiver=caregiver, state=cls.fl, status="rejected",
            submitted_at=timezone.now() - timedelta(days=1),
            signed_name="Queue Applicant", signed_at=timezone.now(), content_hash="old",
        )
        cls.latest_application = CaregiverApplication.objects.create(
            caregiver=caregiver, state=cls.fl, status="submitted", version=2,
            signed_name="Queue Applicant", signed_at=timezone.now(), content_hash="latest",
        )
        no_application = User.objects.create_user(
            email="queue-no-application@example.com", role=cls.caregiver_role, state=cls.fl,
        )
        Caregiver.objects.create(id=no_application, state=cls.fl, first_name="No", last_name="Application")
        deleted_application = User.objects.create_user(
            email="queue-deleted-application@example.com", role=cls.caregiver_role, state=cls.fl,
        )
        deleted_caregiver = Caregiver.objects.create(
            id=deleted_application, state=cls.fl, first_name="Deleted", last_name="Application",
        )
        CaregiverApplication.objects.create(
            caregiver=deleted_caregiver, state=cls.fl, status="submitted", deleted_at=timezone.now(),
            signed_name="Deleted Application", signed_at=timezone.now(), content_hash="deleted",
        )
        cls.in_user = User.objects.create_user(
            email="queue-other-state@example.com", role=cls.caregiver_role, state=cls.in_state,
        )
        in_caregiver = Caregiver.objects.create(
            id=cls.in_user, state=cls.in_state, first_name="Other", last_name="State",
        )
        CaregiverApplication.objects.create(
            caregiver=in_caregiver, state=cls.in_state, status="submitted",
            signed_name="Other State", signed_at=timezone.now(), content_hash="outside",
        )

    def test_applicant_queue_contains_only_profiles_with_current_applications(self):
        self.client.force_authenticate(self.super_user)
        response = self.client.get("/api/v1/admin/caregivers?has_application=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = response.json()["results"]
        self.assertEqual({row["id"] for row in rows}, {str(self.with_application.pk), str(self.in_user.pk)})
        applicant = next(row for row in rows if row["id"] == str(self.with_application.pk))
        self.assertEqual(applicant["application_id"], str(self.latest_application.pk))
        self.assertEqual(applicant["application_status"], "submitted")

    def test_applicant_status_filter_uses_latest_application(self):
        self.client.force_authenticate(self.super_user)
        rejected = self.client.get("/api/v1/admin/caregivers?has_application=true&status=rejected")
        self.assertEqual(rejected.status_code, status.HTTP_200_OK)
        self.assertEqual(rejected.json()["count"], 0)
        submitted = self.client.get("/api/v1/admin/caregivers?has_application=true&status=submitted")
        self.assertEqual(submitted.status_code, status.HTTP_200_OK)
        self.assertEqual(submitted.json()["count"], 2)

    def test_state_admin_queue_never_includes_other_states(self):
        self.client.force_authenticate(self.fl_admin)
        response = self.client.get("/api/v1/admin/caregivers?has_application=true&state=indiana")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([row["id"] for row in response.json()["results"]], [str(self.with_application.pk)])

    def test_queue_denies_unassigned_admin_and_caregiver(self):
        unassigned = User.objects.create_user(email="queue-unassigned@example.com", role=self.admin_role)
        for user in (unassigned, self.with_application):
            self.client.force_authenticate(user)
            self.assertEqual(
                self.client.get("/api/v1/admin/caregivers?has_application=true").status_code,
                status.HTTP_403_FORBIDDEN,
            )
