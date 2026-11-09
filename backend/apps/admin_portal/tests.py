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

