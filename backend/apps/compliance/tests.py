from rest_framework import status
from apps.core.test_utils import BasePlatformTestCase, User
from apps.compliance.models import Announcement, Notification

class ComplianceTests(BasePlatformTestCase):
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
        cls.client_user = User.objects.create_user(
            email="client@test.com", password="password123",
            role=cls.client_role, state=cls.fl,
        )
        cls.announcement = Announcement.objects.create(
            state=cls.fl, title="Holiday Hours", body="Closed on Christmas.",
            audience="all", active=True, created_by=cls.super_user,
        )
        cls.in_announcement = Announcement.objects.create(
            state=cls.in_state, title="Indiana Only", body="Hoosier update.",
            audience="all", active=True, created_by=cls.super_user,
        )
        cls.admin_announcement = Announcement.objects.create(
            state=None, title="Internal Admin", body="Staff memo.",
            audience="administrator", active=True, created_by=cls.super_user,
        )
        cls.notification = Notification.objects.create(
            user=cls.cg_user, type="system", title="Welcome", body="Hello!", read=False,
        )

    def test_admin_announcements_crud(self):
        self._login_super()
        resp = self.client.get("/api/v1/admin/announcements")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        items = resp.json().get("results", resp.json())
        self.assertTrue(any(a["id"] == str(self.announcement.id) for a in items))
        created = next(a for a in items if a["id"] == str(self.announcement.id))
        self.assertEqual(created["states"]["code"], "FL")
        self.assertEqual(created["users"]["email"], "admin@caregiverplatform.com")
        self.assertIn("is_active", created)

        # Create (super, all states via null state_id)
        create_resp = self.client.post("/api/v1/admin/announcements", {
            "title": "Winter Notice", "body": "Drive carefully.",
            "audience": "caregiver", "state_id": None, "is_active": True,
        }, format="json")
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        ann_id = create_resp.json()["id"]
        self.assertIsNone(create_resp.json()["states"])

        # FL state admin create forces its own state
        self._login("fl.admin@test.com")
        create_resp = self.client.post("/api/v1/admin/announcements", {
            "title": "FL Only", "body": "Local update.", "audience": "all", "state_id": None,
        }, format="json")
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_resp.json()["states"]["code"], "FL")
        fl_ann_id = create_resp.json()["id"]

        # FL admin can toggle its own announcement
        toggle_resp = self.client.patch(f"/api/v1/admin/announcements/{fl_ann_id}", {"is_active": False})
        self.assertEqual(toggle_resp.status_code, status.HTTP_200_OK)
        self.assertFalse(toggle_resp.json()["is_active"])

        # Cross-state admin cannot toggle FL announcement
        self._login("in.admin@test.com")
        toggle_resp = self.client.patch(f"/api/v1/admin/announcements/{fl_ann_id}", {"is_active": True})
        self.assertEqual(toggle_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Super admin DELETE returns 204
        self._login_super()
        delete_resp = self.client.delete(f"/api/v1/admin/announcements/{ann_id}")
        self.assertEqual(delete_resp.status_code, status.HTTP_204_NO_CONTENT)

    def test_announcements_public_feed_role_scoped(self):
        # Create a nationwide announcement (state=None, audience='all')
        Announcement.objects.create(
            state=None, title="Nationwide Policy", body="Applies to all states.",
            audience="all", active=True, created_by=self.super_user,
        )

        self._login("cg@test.com")
        resp = self.client.get("/api/v1/announcements")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        titles = [a["title"] for a in resp.json()]
        self.assertIn("Holiday Hours", titles)          # same-state, all audience
        self.assertIn("Nationwide Policy", titles)      # nationwide (state=None) visible to state caregiver
        self.assertNotIn("Indiana Only", titles)        # different state hidden
        self.assertNotIn("Internal Admin", titles)      # audience mismatch hidden

        # Check that super_admin and state admin can see "Internal Admin"
        self._login("admin@caregiverplatform.com", "AdminPassword123!")
        super_resp = self.client.get("/api/v1/announcements")
        self.assertEqual(super_resp.status_code, status.HTTP_200_OK)
        super_titles = [a["title"] for a in super_resp.json()]
        self.assertIn("Internal Admin", super_titles)
        self.assertIn("Nationwide Policy", super_titles)

    def test_notifications_read_all(self):
        self._login("cg@test.com")
        resp = self.client.patch("/api/v1/caregivers/me/notifications/read-all")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("notification(s) marked as read", resp.json()["detail"])
        self.assertTrue(Notification.objects.get(id=self.notification.id).read)

        # Client + admin scoped read-all exist
        self._login("client@test.com")
        self.assertEqual(self.client.patch("/api/v1/clients/me/notifications/read-all").status_code, status.HTTP_200_OK)
        self._login_super()
        self.assertEqual(self.client.patch("/api/v1/admin/notifications/read-all").status_code, status.HTTP_200_OK)

    def test_audit_logging_and_stream(self):
        from apps.compliance.audit import record_audit_log
        from apps.compliance.models import AuditLog

        # 1. Record an audit log for FL state
        log = record_audit_log(
            action="UPDATE_USER_STATUS",
            table_name="users",
            record_id=str(self.cg_user.id),
            user=self.fl_admin,
            entity_state=self.fl,
            old_values={"status": "inactive"},
            new_values={"status": "active", "is_active": True},
            ip_address="192.168.1.10",
        )
        self.assertIsNotNone(log)
        self.assertEqual(log.action, "UPDATE_USER_STATUS")

        # 2. Super admin gets all audit logs with trailing slash and slash-less alias
        self._login_super()
        resp = self.client.get("/api/v1/admin/audit-logs/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        items = resp.json().get("results", resp.json())
        self.assertTrue(any(item["id"] == str(log.id) for item in items))
        log_data = next(item for item in items if item["id"] == str(log.id))
        self.assertEqual(log_data["user_email"], "fl.admin@test.com")
        self.assertEqual(log_data["state_code"], "FL")
        self.assertEqual(log_data["ip_address"], "192.168.1.10")

        # 3. State-scoped filtering: FL admin sees FL log, IN admin does not
        self._login("fl.admin@test.com")
        fl_resp = self.client.get("/api/v1/admin/audit-logs/")
        self.assertEqual(fl_resp.status_code, status.HTTP_200_OK)
        fl_items = fl_resp.json().get("results", fl_resp.json())
        self.assertTrue(any(item["id"] == str(log.id) for item in fl_items))

        self._login("in.admin@test.com")
        in_resp = self.client.get("/api/v1/admin/audit-logs/")
        self.assertEqual(in_resp.status_code, status.HTTP_200_OK)
        in_items = in_resp.json().get("results", in_resp.json())
        self.assertFalse(any(item["id"] == str(log.id) for item in in_items))

    def test_audit_records_cannot_be_changed_or_deleted(self):
        from apps.compliance.models import AuditLog
        log = AuditLog.objects.create(action="ORIGINAL", table_name="clients", record_id="record")
        log.action = "EDITED"
        with self.assertRaises(ValueError):
            log.save()
        with self.assertRaises(ValueError):
            AuditLog.objects.filter(pk=log.pk).update(action="EDITED")
        with self.assertRaises(ValueError):
            AuditLog.objects.filter(pk=log.pk).delete()
        with self.assertRaises(ValueError):
            log.delete()
        log.refresh_from_db()
        self.assertEqual(log.action, "ORIGINAL")

    def test_audit_admin_has_no_change_or_delete_actions(self):
        from django.contrib import admin
        from rest_framework.test import APIRequestFactory
        from apps.compliance.models import AuditLog
        request = APIRequestFactory().get("/")
        request.user = self.super_user
        registered = admin.site._registry[AuditLog]
        self.assertFalse(registered.has_change_permission(request))
        self.assertFalse(registered.has_delete_permission(request))
        self.assertFalse(registered.has_add_permission(request))
