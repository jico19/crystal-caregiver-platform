from datetime import date, timedelta
from rest_framework import status
from apps.core.test_utils import BasePlatformTestCase, User
from apps.caregivers.models import Caregiver
from apps.documents.models import DocumentType, Document

class DocumentsTests(BasePlatformTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.cg_user = User.objects.create_user(
            email="cg@test.com", password="password123",
            role=cls.caregiver_role, state=cls.fl,
        )
        cls.caregiver = Caregiver.objects.create(
            id=cls.cg_user, state=cls.fl,
            first_name="Maya", last_name="Rivera",
            phone="555-0101", date_of_birth=date(1990, 5, 1),
        )
        cls.doc_type = DocumentType.objects.create(
            name="CPR Certification", for_role="caregiver", requires_expiration=True,
        )
        cls.cg_doc = Document.objects.create(
            owner=cls.cg_user, document_type=cls.doc_type, state=cls.fl,
            storage_path="documents/FL/cg/cpr.pdf", status="approved",
            expiration_date=date.today() + timedelta(days=20),
        )

    def test_documents_me_nested_shape(self):
        self._login("cg@test.com")
        resp = self.client.get("/api/v1/documents/me")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        docs = resp.json()["documents"]
        self.assertEqual(len(docs), 1)
        self.assertEqual(docs[0]["document_types"]["name"], "CPR Certification")
        self.assertIn("uploaded_at", docs[0])
        self.assertIn("rejection_reason", docs[0])

    def test_upload_intent_and_django_media_storage_lifecycle(self):
        self._login("cg@test.com")
        
        # 1. Request upload intent
        intent_resp = self.client.post("/api/v1/documents/upload-intent", {
            "document_type_id": self.doc_type.id,
            "filename": "driver_license.pdf",
            "content_type": "application/pdf",
            "expiration_date": (date.today() + timedelta(days=365)).isoformat(),
        })
        self.assertEqual(intent_resp.status_code, status.HTTP_200_OK)
        doc_id = intent_resp.json()["document_id"]
        upload_url = intent_resp.json()["upload_url"]
        self.assertIn(f"/api/v1/documents/{doc_id}/upload-file/", upload_url)
        self.assertIn("token=", upload_url)

        # 2. Upload file via PUT using the signed upload_url (simulating browser fetch)
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

        # 4. Stream file via GET download_url (simulating window.open with signed token)
        self.client.logout()
        stream_resp = self.client.get(download_url)
        self.assertEqual(stream_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(b"".join(stream_resp.streaming_content), file_bytes)

    def test_unauthorized_upload_rejected(self):
        # Invalid token rejected
        bad_resp = self.client.put(
            f"/api/v1/documents/{self.cg_doc.id}/upload-file/?token=bad-token",
            data=b"unauthorized content",
            content_type="application/pdf",
        )
        self.assertEqual(bad_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_expiring_document_requires_a_date_and_valid_filename(self):
        self.client.force_authenticate(self.cg_user)
        response = self.client.post("/api/v1/documents/upload-intent", {
            "document_type_id": self.doc_type.pk, "filename": "credential.pdf",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expiration_date", response.json())
        for filename in ("../credential.pdf", "..\\credential.pdf", "malware.exe"):
            response = self.client.post("/api/v1/documents/upload-intent", {
                "document_type_id": self.doc_type.pk, "filename": filename,
                "expiration_date": (date.today() + timedelta(days=365)).isoformat(),
            })
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_wrong_role_document_type_is_rejected(self):
        client_type = DocumentType.objects.create(name="Client only test", for_role="client")
        self.client.force_authenticate(self.cg_user)
        response = self.client.post("/api/v1/documents/upload-intent", {
            "document_type_id": client_type.pk, "filename": "card.pdf",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_download_token_cannot_overwrite_a_document(self):
        from apps.core.storage import storage_service
        storage_service.save_file(self.cg_doc.storage_path, b"%PDF-1.4 original")
        self.client.force_authenticate(self.cg_user)
        download = self.client.get(f"/api/v1/documents/{self.cg_doc.pk}/download-url").json()["download_url"]
        self.client.force_authenticate(user=None)
        overwrite = self.client.put(
            download.replace("/file/", "/upload-file/"), b"%PDF-1.4 replaced",
            content_type="application/pdf",
        )
        self.assertEqual(overwrite.status_code, status.HTTP_403_FORBIDDEN)
        with storage_service.open_file(self.cg_doc.storage_path) as stored:
            self.assertEqual(stored.read(), b"%PDF-1.4 original")

    def test_admin_document_queue_filters_and_exposes_metadata(self):
        self.client.force_authenticate(self.super_user)
        response = self.client.get("/api/v1/admin/documents?status=pending_review")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["count"], 0)
        approved = self.client.get("/api/v1/admin/documents?status=approved").json()["results"]
        self.assertEqual(approved[0]["document_type_name"], self.doc_type.name)
        self.assertEqual(approved[0]["state_code"], "FL")

    def test_scope_upload_categories_exist_without_new_mandatory_rules(self):
        expected = {
            "CNA/HHA Certificate", "Physical Exam", "Social Security Card", "Auto Insurance",
            "Driver's Insurance", "Direct Deposit Form", "Other onboarding documents",
            "Insurance Cards", "Physician Orders", "Plan of Care", "Identification",
            "Authorizations", "Other required documents",
        }
        self.assertTrue(expected.issubset(set(DocumentType.objects.values_list("name", flat=True))))


class ClientDocumentStatusTests(BasePlatformTestCase):
    def test_expiring_and_renewed_client_documents_are_not_missing(self):
        from apps.clients.models import Client
        from apps.documents.models import DocumentRequirement
        user = User.objects.create_user(email="client-document-status@example.com", role=self.client_role, state=self.fl)
        Client.objects.create(id=user, state=self.fl, first_name="Document", last_name="Client", date_of_birth=date(1960, 1, 1))
        document_type = DocumentType.objects.create(name="Client Expiring Credential", for_role="client", requires_expiration=True)
        DocumentRequirement.objects.create(state=self.fl, document_type=document_type, for_role="client", required=True)
        Document.objects.create(
            owner=user, state=self.fl, document_type=document_type, storage_path="client/current.pdf",
            status="approved", expiration_date=date.today() + timedelta(days=10),
        )
        self.client.force_authenticate(user)
        response = self.client.get("/api/v1/clients/me/document-status")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["missing"], [])
        self.assertEqual(response.json()["expiring_soon"], [document_type.name])
        Document.objects.create(
            owner=user, state=self.fl, document_type=document_type, storage_path="client/old.pdf",
            status="approved", expiration_date=date.today() - timedelta(days=10),
        )
        renewed = self.client.get("/api/v1/clients/me/document-status").json()
        self.assertEqual(renewed["expired"], [])
        self.assertTrue(renewed["compliant"])
