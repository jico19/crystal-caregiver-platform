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

        # Regular user lacks super admin permission.
        fl_admin = User.objects.create_user(
            email="fl.scoped@test.com", password="password123",
            role=self.admin_role, state=self.fl,
        )
        req.user = fl_admin
        self.assertFalse(is_super.has_permission(req, None))
        self.assertTrue(is_state_admin.has_permission(req, None))


from django.test import SimpleTestCase
from unittest.mock import patch
from apps.core.storage import generate_document_token, verify_document_token


class DocumentTokenTests(SimpleTestCase):
    def test_token_is_bound_to_upload_or_download(self):
        upload = generate_document_token("document", purpose="upload")
        download = generate_document_token("document", purpose="download")
        self.assertTrue(verify_document_token("document", upload, purpose="upload"))
        self.assertTrue(verify_document_token("document", download, purpose="download"))
        self.assertFalse(verify_document_token("document", upload, purpose="download"))
        self.assertFalse(verify_document_token("document", download, purpose="upload"))
        self.assertFalse(verify_document_token("other-document", download, purpose="download"))

    def test_token_expires_at_the_advertised_lifetime(self):
        with patch("django.core.signing.time.time", return_value=100000):
            token = generate_document_token("document", purpose="download")
        with patch("django.core.signing.time.time", return_value=100901):
            self.assertFalse(verify_document_token("document", token, purpose="download", max_age=900))
        with patch("django.core.signing.time.time", return_value=100899):
            self.assertTrue(verify_document_token("document", token, purpose="download", max_age=900))
