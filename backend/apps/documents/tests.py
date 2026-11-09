from datetime import date, timedelta
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from uuid import UUID

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status

from apps.caregivers.models import Caregiver
from apps.compliance.models import AuditLog
from apps.core.storage import (
    generate_document_token,
    storage_service,
    verify_document_token,
)
from apps.core.test_utils import BasePlatformTestCase, User
from apps.documents.models import DocumentType, Document, DocumentRequirement
from apps.documents.services import (
    ADMIN_CAREGIVER_POLICY,
    CAREGIVER_CREDENTIAL_POLICY,
    CLIENT_DOCUMENT_POLICY,
    calculate_document_compliance,
)
from apps.documents.test_utils import ComplianceEndpointTestCase


class DocumentsTests(BasePlatformTestCase):
    def setUp(self):
        super().setUp()
        media = TemporaryDirectory()
        self.addCleanup(media.cleanup)
        self.media_root = Path(media.name)
        settings = override_settings(MEDIA_ROOT=media.name)
        settings.enable()
        self.addCleanup(settings.disable)
        local_storage = patch.object(storage_service, "use_s3", False)
        local_storage.start()
        self.addCleanup(local_storage.stop)

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
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

    def test_documents_me_nested_shape(self):
        self._login("cg@test.com")
        resp = self.client.get("/api/v1/documents/me")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        docs = resp.json()["documents"]
        self.assertEqual(len(docs), 1)
        self.assertEqual(
            docs[0]["document_types"]["name"], "CPR Certification"
        )
        self.assertIn("uploaded_at", docs[0])
        self.assertIn("rejection_reason", docs[0])

    def test_upload_intent_and_django_media_storage_lifecycle(self):
        self._login("cg@test.com")

        # 1. Request upload intent
        intent_resp = self.client.post(
            "/api/v1/documents/upload-intent",
            {
                "document_type_id": self.doc_type.id,
                "filename": "driver_license.pdf",
                "content_type": "application/pdf",
            },
        )
        self.assertEqual(intent_resp.status_code, status.HTTP_200_OK)
        doc_id = intent_resp.json()["document_id"]
        upload_url = intent_resp.json()["upload_url"]
        self.assertIn(f"/api/v1/documents/{doc_id}/upload-file/", upload_url)
        self.assertIn("token=", upload_url)

        # 2. Upload file via PUT using the signed upload_url (simulating
        # browser fetch)
        file_bytes = b"%PDF-1.4 sample driver license document"
        # Simulate unauthenticated browser fetch using the signed token
        self.client.logout()
        put_resp = self.client.put(
            upload_url,
            data=file_bytes,
            content_type="application/pdf",
        )
        self.assertEqual(put_resp.status_code, status.HTTP_200_OK)
        self.assertIn("File uploaded successfully", put_resp.json()["message"])

        # 3. Retrieve download URL (authenticated)
        self._login("cg@test.com")
        down_resp = self.client.get(f"/api/v1/documents/{doc_id}/download-url")
        self.assertEqual(down_resp.status_code, status.HTTP_200_OK)
        download_url = down_resp.json()["download_url"]
        self.assertIn(f"/api/v1/documents/{doc_id}/file/", download_url)

        # 4. Stream file via GET download_url (simulating window.open
        # with signed token)
        self.client.logout()
        stream_resp = self.client.get(download_url)
        self.assertEqual(stream_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(b"".join(stream_resp.streaming_content), file_bytes)
        stream_resp.close()

    def test_unauthorized_upload_rejected(self):
        # Invalid token rejected
        bad_resp = self.client.put(
            f"/api/v1/documents/{self.cg_doc.id}/upload-file/?token=bad-token",
            data=b"unauthorized content",
            content_type="application/pdf",
        )
        self.assertEqual(bad_resp.status_code, status.HTTP_403_FORBIDDEN)

    def _upload(
        self, content=b"%PDF-1.4 synthetic document", *, url=None, **headers
    ):
        return self.client.put(
            url or f"/api/v1/documents/{self.cg_doc.pk}/upload-file/",
            content,
            content_type="application/pdf",
            **headers,
        )

    def _upload_audits(self):
        return AuditLog.objects.filter(action="UPLOAD_DOCUMENT")

    def test_intent_contract_storage_path_and_trusted_identity(self):
        self.client.force_authenticate(user=self.cg_user)
        doc_id = UUID("00000000-0000-0000-0000-000000000006")
        with patch("uuid.uuid4", return_value=doc_id):
            response = self.client.post(
                "/api/v1/documents/upload-intent",
                {
                    "document_type_id": self.doc_type.pk,
                    "filename": "license.pdf",
                    "expiration_date": "2027-01-01",
                    "owner": str(self.super_user.pk),
                    "state_id": self.in_state.pk,
                    "status": "approved",
                },
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            set(response.json()),
            {
                "document_id",
                "upload_url",
                "expires_in_seconds",
            },
        )
        self.assertEqual(response.json()["document_id"], str(doc_id))
        self.assertEqual(
            response.json()["expires_in_seconds"], storage_service.expiration
        )
        upload_prefix = f"/api/v1/documents/{doc_id}/upload-file/?token="
        self.assertTrue(
            response.json()["upload_url"].startswith(upload_prefix)
        )
        self.assertTrue(
            verify_document_token(
                str(doc_id),
                response.json()["upload_url"].removeprefix(upload_prefix),
            )
        )
        doc = Document.objects.get(pk=doc_id)
        self.assertEqual(doc.owner, self.cg_user)
        self.assertEqual(doc.state, self.fl)
        self.assertEqual(doc.status, "pending_review")
        self.assertEqual(doc.expiration_date, date(2027, 1, 1))
        self.assertEqual(
            doc.storage_path,
            f"documents/FL/{self.cg_user.pk}/{doc_id}_license.pdf",
        )
        self.assertFalse(storage_service.exists(doc.storage_path))

    def test_intent_validation_state_and_allocation_failure(self):
        self.client.force_authenticate(user=self.cg_user)
        payload = {
            "document_type_id": self.doc_type.pk,
            "filename": "license.pdf",
        }
        count = Document.objects.count()
        with patch.object(
            storage_service, "generate_presigned_put_url"
        ) as allocate:
            invalid = self.client.post(
                "/api/v1/documents/upload-intent",
                {
                    **payload,
                    "filename": "",
                },
            )
            self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
            missing_type = self.client.post(
                "/api/v1/documents/upload-intent",
                {
                    **payload,
                    "document_type_id": -1,
                },
            )
            self.assertEqual(
                missing_type.status_code, status.HTTP_404_NOT_FOUND
            )
            self.cg_user.state = None
            no_state = self.client.post(
                "/api/v1/documents/upload-intent", payload
            )
            self.assertEqual(no_state.status_code, status.HTTP_400_BAD_REQUEST)
            allocate.assert_not_called()
        self.cg_user.state = self.fl
        with patch.object(
            storage_service,
            "generate_presigned_put_url",
            side_effect=OSError("Synthetic allocation failure"),
        ):
            with self.assertRaisesMessage(
                OSError, "Synthetic allocation failure"
            ):
                self.client.post("/api/v1/documents/upload-intent", payload)
        self.assertEqual(Document.objects.count(), count)
        self.assertEqual(list(self.media_root.rglob("*")), [])

    def test_upload_response_and_audit_contract(self):
        self.client.force_authenticate(user=self.cg_user)
        content = b"%PDF-1.4 synthetic upload"
        response = self._upload(
            content,
            HTTP_X_FORWARDED_FOR="192.0.2.6, 192.0.2.7",
            HTTP_USER_AGENT="Synthetic Upload Test",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        file_url = response.json()["file_url"]
        file_prefix = f"/api/v1/documents/{self.cg_doc.pk}/file/?token="
        self.assertTrue(file_url.startswith(file_prefix))
        self.assertTrue(
            verify_document_token(
                str(self.cg_doc.pk),
                file_url.removeprefix(file_prefix),
            )
        )
        self.assertEqual(
            response.json(),
            {
                "message": "File uploaded successfully to media storage.",
                "document_id": str(self.cg_doc.pk),
                "storage_path": self.cg_doc.storage_path,
                "file_url": file_url,
            },
        )
        self.cg_doc.refresh_from_db()
        self.assertEqual(self.cg_doc.status, "pending_review")
        self.assertEqual(
            (self.media_root / self.cg_doc.storage_path).read_bytes(), content
        )
        audit = self._upload_audits().get()
        self.assertEqual(audit.record_id, str(self.cg_doc.pk))
        self.assertEqual(audit.user, self.cg_user)
        self.assertEqual(audit.entity_state, self.fl)
        self.assertEqual(audit.ip_address, "192.0.2.6")
        self.assertEqual(audit.user_agent, "Synthetic Upload Test")
        self.assertIsInstance(audit.request_id, UUID)
        self.assertEqual(
            audit.new_values,
            {
                "status": "pending_review",
                "storage_path": self.cg_doc.storage_path,
            },
        )

    def test_multipart_upload_uses_file_bytes_and_allocated_filename(self):
        self.client.force_authenticate(user=self.cg_user)
        url = f"/api/v1/documents/{self.cg_doc.pk}/upload-file/"
        before = Document.objects.values().get(pk=self.cg_doc.pk)
        invalid = self.client.post(
            url,
            {
                "file": SimpleUploadedFile(
                    "disguised.pdf", b"invalid content"
                ),
            },
            format="multipart",
        )
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            Document.objects.values().get(pk=self.cg_doc.pk), before
        )
        self.assertFalse(storage_service.exists(self.cg_doc.storage_path))
        self.assertFalse(self._upload_audits().exists())
        content = b"%PDF-1.4 synthetic multipart document"
        response = self.client.post(
            url,
            {
                "file": SimpleUploadedFile("browser-name.pdf", content),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            (self.media_root / self.cg_doc.storage_path).read_bytes(), content
        )
        self.assertEqual(
            response.json()["storage_path"], self.cg_doc.storage_path
        )

    def test_intent_passes_content_type_and_presigned_url_through(self):
        self.client.force_authenticate(user=self.cg_user)
        for content_type in (None, "image/png"):
            with self.subTest(content_type=content_type):
                payload = {
                    "document_type_id": self.doc_type.pk,
                    "filename": "test.png",
                }
                if content_type:
                    payload["content_type"] = content_type
                with patch.object(
                    storage_service,
                    "generate_presigned_put_url",
                    return_value="https://storage.example.test/signed-put",
                ) as allocate:
                    response = self.client.post(
                        "/api/v1/documents/upload-intent", payload
                    )
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                doc = Document.objects.get(pk=response.json()["document_id"])
                allocate.assert_called_once_with(
                    storage_key=doc.storage_path,
                    content_type=content_type or "application/pdf",
                    doc_id=doc.pk,
                )
                self.assertEqual(
                    response.json()["upload_url"],
                    "https://storage.example.test/signed-put",
                )

    def test_invalid_uploads_do_not_store_mutate_or_audit(self):
        self.client.force_authenticate(user=self.cg_user)
        cases = (
            (b"", "pdf", "No file content received."),
            (b"abc", "pdf", "File is empty or corrupted."),
            (
                b"not a pdf",
                "pdf",
                "File header does not match valid PDF signature.",
            ),
            (
                b"not a jpeg",
                "jpg",
                "File header does not match valid JPEG signature.",
            ),
            (
                b"not a png",
                "png",
                "File header does not match valid PNG signature.",
            ),
            (
                b"%PDF-1.4",
                "exe",
                "File extension '.exe' is not permitted. "
                "Only PDF and standard image files are allowed.",
            ),
            (
                b"%PDF-" + b"x" * (15 * 1024 * 1024 - 4),
                "pdf",
                "File exceeds maximum size limit of 15MB.",
            ),
        )
        for content, extension, message in cases:
            with self.subTest(extension=extension, message=message):
                self.cg_doc.storage_path = (
                    f"documents/FL/synthetic/file.{extension}"
                )
                self.cg_doc.save()
                before = Document.objects.values().get(pk=self.cg_doc.pk)
                with patch.object(storage_service, "save_file") as save:
                    response = self._upload(content)
                self.assertEqual(
                    response.status_code, status.HTTP_400_BAD_REQUEST
                )
                self.assertEqual(response.json(), {"detail": message})
                save.assert_not_called()
                self.assertEqual(
                    Document.objects.values().get(pk=self.cg_doc.pk), before
                )
        self.assertFalse(self._upload_audits().exists())
        self.assertEqual(list(self.media_root.rglob("*")), [])

    def test_supported_extensions_and_maximum_size(self):
        self.client.force_authenticate(user=self.cg_user)
        for extension, content in (
            ("pdf", b"%PDF-" + b"x" * (15 * 1024 * 1024 - 5)),
            ("png", b"\x89PNGsynthetic"),
            ("jpg", b"\xff\xd8synthetic"),
            ("jpeg", b"\xff\xd8synthetic"),
            ("PDF", b"%PDF-1.4 synthetic"),
        ):
            with self.subTest(extension=extension):
                self.cg_doc.storage_path = (
                    f"documents/FL/synthetic/file.{extension}"
                )
                self.cg_doc.save()
                response = self._upload(content)
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(
                    (self.media_root / self.cg_doc.storage_path).read_bytes(),
                    content,
                )

    def test_owner_state_admin_superadmin_and_token_authorization(self):
        same_state_admin = User.objects.get(
            email="fl.admin@caregiverplatform.com"
        )
        other_admin = User.objects.create_user(
            email="upload.other.admin@example.test",
            role=self.admin_role,
            state=self.in_state,
        )
        other_owner = User.objects.create_user(
            email="upload.other.owner@example.test",
            role=self.caregiver_role,
            state=self.fl,
        )
        for actor, expected in (
            (None, 403),
            (other_owner, 403),
            (other_admin, 403),
            (self.cg_user, 200),
            (same_state_admin, 200),
            (self.super_user, 200),
        ):
            with self.subTest(actor=actor):
                self.client.force_authenticate(user=actor)
                before = Document.objects.values().get(pk=self.cg_doc.pk)
                with patch.object(storage_service, "save_file") as save:
                    response = self._upload()
                self.assertEqual(response.status_code, expected)
                if expected == 403:
                    save.assert_not_called()
                    self.assertEqual(
                        Document.objects.values().get(pk=self.cg_doc.pk),
                        before,
                    )
        self.client.force_authenticate(user=None)
        with patch("django.core.signing.time.time", return_value=1800000000):
            token = generate_document_token(str(self.cg_doc.pk))
        upload_url = (
            f"/api/v1/documents/{self.cg_doc.pk}/upload-file/?token={token}"
        )
        # The one-hour token limit is separate from advertised URL
        # expiration.
        with patch("django.core.signing.time.time", return_value=1800003601):
            self.assertEqual(self._upload(url=upload_url).status_code, 403)
        with patch("django.core.signing.time.time", return_value=1800003600):
            self.assertEqual(self._upload(url=upload_url).status_code, 200)
        other_token = generate_document_token(str(other_owner.pk))
        self.assertEqual(
            self._upload(
                url=upload_url.replace(token, other_token)
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_storage_failure_has_no_status_change_or_success_audit(self):
        self.client.force_authenticate(user=self.cg_user)
        before = Document.objects.values().get(pk=self.cg_doc.pk)
        with patch.object(
            storage_service,
            "save_file",
            side_effect=OSError("Synthetic storage failure"),
        ):
            with self.assertRaisesMessage(
                OSError, "Synthetic storage failure"
            ):
                self._upload()
        self.assertEqual(
            Document.objects.values().get(pk=self.cg_doc.pk), before
        )
        self.assertFalse(self._upload_audits().exists())
        self.assertEqual(list(self.media_root.rglob("*")), [])

    def test_replacement_storage_failure_can_remove_previous_file(self):
        self.client.force_authenticate(user=self.cg_user)
        storage_service.save_file(
            self.cg_doc.storage_path, b"%PDF-1.4 original bytes"
        )
        before = Document.objects.values().get(pk=self.cg_doc.pk)
        with patch(
            "apps.core.storage.default_storage.save",
            side_effect=OSError("Synthetic write failure after deletion"),
        ):
            with self.assertRaisesMessage(
                OSError, "Synthetic write failure after deletion"
            ):
                self._upload()
        self.assertFalse(storage_service.exists(self.cg_doc.storage_path))
        self.assertEqual(
            Document.objects.values().get(pk=self.cg_doc.pk), before
        )
        self.assertFalse(self._upload_audits().exists())

    def test_deleted_document_cannot_be_uploaded(self):
        self.client.force_authenticate(user=self.cg_user)
        self.cg_doc.soft_delete(user=self.super_user)
        with patch.object(storage_service, "save_file") as save:
            response = self._upload()
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        save.assert_not_called()
        self.assertFalse(self._upload_audits().exists())

    def test_database_failure_leaves_saved_bytes_without_success_audit(self):
        self.client.force_authenticate(user=self.cg_user)
        content = b"%PDF-1.4 persisted before database failure"
        before = Document.objects.values().get(pk=self.cg_doc.pk)
        with patch.object(
            Document, "save", side_effect=RuntimeError("Synthetic DB failure")
        ):
            with self.assertRaisesMessage(
                RuntimeError, "Synthetic DB failure"
            ):
                self._upload(content)
        self.assertEqual(
            Document.objects.values().get(pk=self.cg_doc.pk), before
        )
        self.assertEqual(
            (self.media_root / self.cg_doc.storage_path).read_bytes(), content
        )
        self.assertFalse(self._upload_audits().exists())

    def test_best_effort_audit_failure_keeps_existing_upload_success(self):
        self.client.force_authenticate(user=self.cg_user)
        with patch.object(
            AuditLog.objects,
            "create",
            side_effect=RuntimeError("Synthetic audit failure"),
        ):
            response = self._upload()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.cg_doc.refresh_from_db()
        self.assertEqual(self.cg_doc.status, "pending_review")
        self.assertTrue(storage_service.exists(self.cg_doc.storage_path))
        self.assertFalse(self._upload_audits().exists())

    def test_download_url_failure_keeps_saved_bytes_status_and_audit(self):
        self.client.force_authenticate(user=self.cg_user)
        with patch.object(
            storage_service,
            "generate_presigned_get_url",
            side_effect=OSError("Synthetic URL failure"),
        ):
            with self.assertRaisesMessage(OSError, "Synthetic URL failure"):
                self._upload()
        self.cg_doc.refresh_from_db()
        self.assertEqual(self.cg_doc.status, "pending_review")
        self.assertTrue(storage_service.exists(self.cg_doc.storage_path))
        self.assertTrue(self._upload_audits().exists())


class ClientDocumentComplianceTests(ComplianceEndpointTestCase):
    compliance_kind = "client"
    clock_module = "apps.documents.views"
    compliance_url = "/api/v1/clients/me/document-status"

    def setUp(self):
        super().setUp()
        self.compliance_owner = self.client_user
        self.compliance_actor = self.client_user

    def test_document_status_characterization(self):
        self.assert_compliance_characterization()

    def test_replacement_characterization(self):
        self.assert_replacement_characterization()

    def test_requirement_and_owner_scope_characterization(self):
        self.assert_scoping_characterization()

    def test_document_state_scope_characterization(self):
        self.assert_document_state_scope_characterization()

    def test_caregiver_cannot_access_client_document_status(self):
        self.client.force_authenticate(user=self.caregiver_user)
        response = self.client.get(self.compliance_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_deleted_required_document_is_missing(self):
        self.assert_deleted_document_characterization()


class ComplianceCalculationTests(ComplianceEndpointTestCase):
    def _calculate(self, *, policy=CAREGIVER_CREDENTIAL_POLICY, **overrides):
        inputs = {
            "owner": self.caregiver_user,
            "state": self.fl,
            "role": "caregiver",
            "evaluation_date": self.evaluation_date,
            "policy": policy,
        }
        inputs.update(overrides)
        return calculate_document_compliance(**inputs)

    def test_explicit_date_controls_classification_without_hidden_clock(self):
        self._document(
            owner=self.caregiver_user,
            expiration_date=self.evaluation_date,
        )
        before = self._compliance_records()
        with patch("apps.documents.services.date") as clock:
            clock.today.side_effect = AssertionError("Unexpected hidden clock")
            today = self._calculate()
            tomorrow = self._calculate(
                evaluation_date=self.evaluation_date + timedelta(days=1),
            )
        self.assertTrue(today.compliant)
        self.assertEqual(
            [item.id for item in today.expiring_soon],
            [self.required_type.pk],
        )
        self.assertFalse(tomorrow.compliant)
        self.assertEqual(
            [item.id for item in tomorrow.expired],
            [self.required_type.pk],
        )
        self.assertEqual(self._compliance_records(), before)

    def test_named_policies_preserve_the_documented_differences(self):
        self._document(
            owner=self.caregiver_user,
            expiration_date=self.evaluation_date + timedelta(days=30),
        )
        caregiver = self._calculate()
        client = self._calculate(policy=CLIENT_DOCUMENT_POLICY)
        admin = self._calculate(policy=ADMIN_CAREGIVER_POLICY)
        self.assertTrue(caregiver.compliant)
        self.assertFalse(client.compliant)
        self.assertTrue(admin.compliant)
        self.assertEqual(caregiver.expiring_soon, client.expiring_soon)
        self.assertEqual(caregiver.missing_types, ())
        self.assertEqual(client.missing_types, client.required_types)
        self.assertEqual(admin.approved, admin.required_types)

    def test_repeated_calculation_is_read_only_and_uses_two_queries(self):
        self._document(owner=self.caregiver_user)
        for index in range(6):
            document_type = DocumentType.objects.create(
                name=f"Synthetic Additional Required {index}",
            )
            DocumentRequirement.objects.create(
                state=self.fl,
                document_type=document_type,
                for_role="caregiver",
            )
            self._document(
                owner=self.caregiver_user,
                document_type=document_type,
            )
        before = self._compliance_records()
        with self.assertNumQueries(2):
            first = self._calculate()
        with self.assertNumQueries(2):
            repeated = self._calculate()
        self.assertEqual(first, repeated)
        self.assertEqual(len(first.required_types), 7)
        self.assertTrue(first.compliant)
        self.assertEqual(self._compliance_records(), before)

    def test_requirement_matching_uses_state_and_requirement_role(self):
        caregiver_type = DocumentType.objects.create(
            name="Synthetic Caregiver Requirement",
            for_role="client",
        )
        client_type = DocumentType.objects.create(
            name="Synthetic Client Requirement",
            for_role="caregiver",
        )
        optional_type = DocumentType.objects.create(name="Synthetic Optional")
        for state, document_type, role, required in (
            (self.fl, caregiver_type, "caregiver", True),
            (self.fl, client_type, "client", True),
            (self.fl, optional_type, "both", False),
            (self.in_state, client_type, "both", True),
        ):
            DocumentRequirement.objects.create(
                state=state,
                document_type=document_type,
                for_role=role,
                required=required,
            )
        for state, role, expected_ids in (
            (self.fl, "caregiver", {self.required_type.pk, caregiver_type.pk}),
            (self.fl, "client", {self.required_type.pk, client_type.pk}),
            (self.in_state, "caregiver", {client_type.pk}),
            (self.in_state, "client", {client_type.pk}),
        ):
            with self.subTest(state=state.code, role=role):
                result = self._calculate(state=state, role=role)
                self.assertEqual(
                    {item.id for item in result.required_types},
                    expected_ids,
                )
                self.assertEqual(result.missing_types, result.required_types)

    def test_overlapping_role_requirements_keep_existing_duplicates(self):
        DocumentRequirement.objects.create(
            state=self.fl,
            document_type=self.required_type,
            for_role="caregiver",
        )
        result = self._calculate()
        self.assertEqual(
            [item.id for item in result.missing_types],
            [self.required_type.pk, self.required_type.pk],
        )
        self._document(owner=self.caregiver_user)
        result = self._calculate()
        self.assertEqual(len(result.required_types), 2)
        self.assertEqual(len(result.approved), 1)
        self.assertTrue(result.compliant)
