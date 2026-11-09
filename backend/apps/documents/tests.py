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
