import hashlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from apps.core.test_utils import BasePlatformTestCase, User
from apps.marketing.models import WebsiteContent


class WebsitePublishingTests(BasePlatformTestCase):
    def setUp(self):
        super().setUp()
        self.files = TemporaryDirectory(prefix="public-site-tests-")
        self.addCleanup(self.files.cleanup)
        self.root = Path(self.files.name)
        self.override = override_settings(
            PUBLISHED_SITE_ROOT=self.root / "published",
            PUBLIC_SITE_DRAFT_ASSET_ROOT=self.root / "draft-assets",
        )
        self.override.enable()
        self.addCleanup(self.override.disable)
        self.client.force_authenticate(self.super_user)

    def draft(self, state="florida"):
        response = self.client.get(f"/api/v1/admin/website/{state}/")
        self.assertEqual(response.status_code, 200)
        return response.json()

    def save(self, response, state="florida"):
        saved = self.client.put(f"/api/v1/admin/website/{state}/", {
            "draft": response["draft"], "revision": response["revision"],
        }, format="json")
        self.assertEqual(saved.status_code, 200, saved.content)
        return saved.json()

    def publish(self, saved, state="florida"):
        return self.client.post(f"/api/v1/admin/website/{state}/publish/", {
            "revision": saved["revision"],
        }, format="json")

    def test_super_admin_can_save_drafts_and_publish_each_state_independently(self):
        for slug in ("florida", "indiana", "georgia"):
            with self.subTest(state=slug):
                draft = self.draft(slug)
                draft["draft"]["overview"]["title"] = f"Published {slug} office"
                saved = self.save(draft, slug)
                target = self.root / "published" / f"{slug}.json"
                self.assertFalse(target.exists(), "Save draft must not publish")
                published = self.publish(saved, slug)
                self.assertEqual(published.status_code, 200, published.content)
                content = json.loads(target.read_text(encoding="utf-8"))
                self.assertEqual(content["state"]["slug"], slug)
                self.assertEqual(content["overview"]["title"], f"Published {slug} office")
                self.assertNotIn("draft", content)
                self.assertNotIn("users", content)

    def test_public_content_survives_database_unavailability_and_later_drafts(self):
        saved = self.save(self.draft())
        self.assertEqual(self.publish(saved).status_code, 200)
        target = self.root / "published" / "florida.json"
        original = target.read_bytes()
        saved["draft"]["overview"]["title"] = "Unpublished future title"
        self.save(saved)
        with patch("django.db.backends.utils.CursorWrapper.execute", side_effect=RuntimeError("Database unavailable")):
            self.assertEqual(target.read_bytes(), original)
            self.assertEqual(json.loads(original)["state"]["code"], "FL")
        public_response = self.client.get("/api/v1/states/florida/").json()
        self.assertFalse(any(row["section_key"] == "public_site_draft" for row in public_response["content"]))

    def test_stale_saves_and_publishes_do_not_overwrite_current_content(self):
        initial = self.draft()
        saved = self.save(initial)
        self.assertEqual(self.publish(saved).status_code, 200)
        original = (self.root / "published" / "florida.json").read_bytes()
        saved["draft"]["overview"]["title"] = "New draft"
        updated = self.save(saved)
        stale = self.client.put("/api/v1/admin/website/florida/", initial, format="json")
        self.assertEqual(stale.status_code, 409)
        self.assertEqual(self.publish(saved).status_code, 409)
        self.assertNotEqual(updated["revision"], saved["revision"])
        self.assertEqual((self.root / "published" / "florida.json").read_bytes(), original)

    def test_forms_are_explicit_public_uploads_copied_independently_of_private_media(self):
        pdf = b"%PDF-1.4\nAgency approved public form"
        upload = self.client.post("/api/v1/admin/website/assets/", {
            "file": SimpleUploadedFile("admission.pdf", pdf, content_type="application/pdf"),
        }, format="multipart")
        self.assertEqual(upload.status_code, 201, upload.content)
        asset = upload.json()
        self.assertFalse((self.root / "published" / "assets" / asset["asset_key"]).exists())
        draft = self.draft()
        draft["draft"]["forms"] = [{
            "title": "Admission packet", "description": "Public admission form", "category": "admission_packet",
            "asset_key": asset["asset_key"], "filename": asset["filename"],
        }]
        saved = self.save(draft)
        self.assertEqual(self.publish(saved).status_code, 200)
        snapshot = json.loads((self.root / "published" / "florida.json").read_text())
        public_file = self.root / "published" / "assets" / asset["asset_key"]
        self.assertEqual(public_file.read_bytes(), pdf)
        self.assertEqual(snapshot["forms"][0]["file_url"], f"/published-site/assets/{asset['asset_key']}")
        self.assertEqual(asset["asset_key"], hashlib.sha256(pdf).hexdigest() + ".pdf")
        # A later publication can reuse the public copy even if draft storage is gone.
        (self.root / "draft-assets" / asset["asset_key"]).unlink()
        saved["draft"]["overview"]["title"] = "Updated office introduction"
        saved = self.save(saved)
        self.assertEqual(self.publish(saved).status_code, 200)
        self.assertEqual(public_file.read_bytes(), pdf)

    def test_invalid_or_private_file_references_cannot_be_published(self):
        for path in ("../../media/patient.pdf", "/media/patient.pdf", "https://example.com/form.pdf"):
            draft = self.draft()
            draft["draft"]["forms"] = [{"title": "Unsafe reference", "asset_key": path}]
            response = self.client.put("/api/v1/admin/website/florida/", draft, format="json")
            self.assertEqual(response.status_code, 400)
        bad = self.client.post("/api/v1/admin/website/assets/", {
            "file": SimpleUploadedFile("fake.pdf", b"not a pdf", content_type="application/pdf"),
        }, format="multipart")
        self.assertEqual(bad.status_code, 400)

    def test_missing_form_file_or_disk_error_preserves_last_publication(self):
        saved = self.save(self.draft())
        self.assertEqual(self.publish(saved).status_code, 200)
        target = self.root / "published" / "florida.json"
        original = target.read_bytes()
        saved["draft"]["forms"] = [{"title": "Missing file", "asset_key": "a" * 64 + ".pdf"}]
        saved = self.save(saved)
        self.assertEqual(self.publish(saved).status_code, 400)
        self.assertEqual(target.read_bytes(), original)
        saved["draft"]["forms"] = []
        saved = self.save(saved)
        with patch("apps.marketing.publishing.os.replace", side_effect=OSError("Disk unavailable")):
            self.assertEqual(self.publish(saved).status_code, 503)
        self.assertEqual(target.read_bytes(), original)

    def test_publication_requires_saved_content_and_known_state(self):
        initial = self.draft()
        self.assertEqual(self.publish(initial).status_code, 400)
        self.assertEqual(self.client.get("/api/v1/admin/website/ohio/").status_code, 404)

    def test_only_explicit_public_fields_are_exported(self):
        draft = self.draft()
        draft["draft"]["private_users"] = [{"email": "private-test@example.com"}]
        draft["draft"]["contact"]["internal_notes"] = "Private internal test notes"
        saved = self.save(draft)
        self.assertEqual(self.publish(saved).status_code, 200)
        text = (self.root / "published" / "florida.json").read_text()
        self.assertNotIn("private-test@example.com", text)
        self.assertNotIn("Private internal test notes", text)

    def test_only_super_admin_can_manage_or_publish_public_content(self):
        regional = User.objects.create_user(email="regional-cms@example.com", role=self.admin_role, state=self.fl)
        caregiver = User.objects.create_user(email="caregiver-cms@example.com", role=self.caregiver_role, state=self.fl)
        for user in (regional, caregiver, None):
            self.client.force_authenticate(user)
            for method, path in (("get", "florida/"), ("put", "florida/"), ("post", "florida/publish/"), ("post", "assets/")):
                response = getattr(self.client, method)(f"/api/v1/admin/website/{path}")
                self.assertIn(response.status_code, (401, 403))
        self.assertFalse(WebsiteContent.objects.filter(section_key="public_site_draft").exists())
