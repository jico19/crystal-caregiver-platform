from rest_framework import status
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory
from apps.core.test_utils import BasePlatformTestCase, User
from apps.core.permissions import IsSuperAdmin, IsStateScopedAdmin
from apps.core.models import State

class CorePlatformTests(BasePlatformTestCase):
    def test_health_check(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["status"], "healthy")

    def test_core_rbac_permissions(self):
        factory = APIRequestFactory()
        is_super = IsSuperAdmin()
        is_state_admin = IsStateScopedAdmin()

        # Super admin has global permission
        req = factory.get("/")
        req.user = self.super_user
        self.assertTrue(is_super.has_permission(req, None))
        self.assertTrue(is_state_admin.has_permission(req, None))

        # Regular user lacks super admin permission
        fl_admin = User.objects.create_user(
            email="fl.scoped@test.com", password="password123",
            role=self.admin_role, state=self.fl,
        )
        req.user = fl_admin
        self.assertFalse(is_super.has_permission(req, None))
        self.assertTrue(is_state_admin.has_permission(req, None))
