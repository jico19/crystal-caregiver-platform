import os
import uuid
import mimetypes
from datetime import date, timedelta
from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from apps.core.permissions import IsStateScopedAdmin, IsClient
from apps.core.mixins import ScopedStateQuerySetMixin
from apps.core.storage import storage_service, verify_document_token
from apps.clients.models import Client
from apps.caregivers.models import Caregiver
from apps.compliance.audit import record_audit_log
from .models import DocumentType, DocumentRequirement, Document
from .serializers import (
    DocumentTypeSerializer,
    DocumentRequirementSerializer,
    DocumentSerializer,
    DocumentMeSerializer,
    UploadIntentSerializer,
    DocumentReviewSerializer,
)

class DocumentTypesListView(APIView):
    """GET /api/v1/documents/types"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        types = DocumentType.objects.all()
        return Response(DocumentTypeSerializer(types, many=True).data)

class DocumentUploadIntentView(APIView):
    """POST /api/v1/documents/upload-intent - Allocates document record and presigned upload URL."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = UploadIntentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user
        doc_type = get_object_or_404(DocumentType, id=data["document_type_id"])
        if doc_type.for_role not in ("both", getattr(user.role, "name", None)):
            return Response({"document_type_id": ["This document type is not available for your role."]}, status=status.HTTP_400_BAD_REQUEST)
        if doc_type.requires_expiration and not data.get("expiration_date"):
            return Response({"expiration_date": ["An expiration date is required for this document type."]}, status=status.HTTP_400_BAD_REQUEST)
        
        # Determine jurisdiction
        state = user.state
        if not state:
            return Response({"detail": "User is not mapped to an active state jurisdiction."}, status=status.HTTP_400_BAD_REQUEST)

        doc_id = uuid.uuid4()
        storage_key = f"documents/{state.code}/{user.id}/{doc_id}_{data['filename']}"
        upload_url = storage_service.generate_presigned_put_url(
            storage_key=storage_key,
            content_type=data.get("content_type", "application/pdf"),
            doc_id=doc_id,
        )

        doc = Document.objects.create(
            id=doc_id,
            owner=user,
            document_type=doc_type,
            state=state,
            storage_path=storage_key,
            status="pending_review",
            expiration_date=data.get("expiration_date"),
        )

        return Response(
            {
                "document_id": str(doc.id),
                "upload_url": upload_url,
                "expires_in_seconds": storage_service.expiration,
            },
            status=status.HTTP_200_OK,
        )

class DocumentMeListView(APIView):
    """GET /api/v1/documents/me - The authenticated user's document records."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        docs = Document.objects.filter(owner=request.user, deleted_at__isnull=True).select_related("document_type")
        return Response({"documents": DocumentMeSerializer(docs, many=True).data})

class ClientDocumentStatusView(APIView):
    """GET /api/v1/clients/me/document-status - Compliance overview for a client."""
    permission_classes = [IsClient]

    def get(self, request):
        client = get_object_or_404(Client, id=request.user)
        reqs = DocumentRequirement.objects.filter(
            state=client.state,
            for_role__in=["client", "both"],
            required=True,
        ).select_related("document_type")

        now = date.today()
        thirty_days = now + timedelta(days=30)
        docs = Document.objects.filter(owner=request.user, state=client.state, deleted_at__isnull=True).select_related("document_type")

        approved = []
        expired = []
        expiring_soon = []
        for d in docs:
            if d.status == "approved":
                if d.document_type.requires_expiration and not d.expiration_date:
                    continue
                if d.expiration_date and d.expiration_date < now:
                    expired.append(d.document_type.name)
                elif d.expiration_date and d.expiration_date <= thirty_days:
                    expiring_soon.append(d.document_type.name)
                else:
                    approved.append(d.document_type.name)
            elif d.status == "expired":
                expired.append(d.document_type.name)

        current_names = set(approved) | set(expiring_soon)
        expired = sorted(set(expired) - current_names)
        expiring_soon = sorted(set(expiring_soon) - set(approved))

        required_types = [
            {"document_type_id": r.document_type_id, "name": r.document_type.name}
            for r in reqs
        ]
        missing = [
            {"document_type_id": r.document_type_id, "name": r.document_type.name}
            for r in reqs
            if r.document_type.name not in current_names
        ]
        compliant = len(missing) == 0 and len(expired) == 0

        return Response({
            "summary": {
                "missing": len(missing),
                "expired": len(expired),
                "expiring_soon": len(expiring_soon),
                "compliant": compliant,
            },
            "compliant": compliant,
            "required_types": required_types,
            "missing": missing,
            "expired": expired,
            "expiring_soon": expiring_soon,
        })

class AdminCaregiverDocumentsView(APIView):
    """GET /api/v1/admin/caregivers/{caregiver_id}/documents"""
    permission_classes = [IsStateScopedAdmin]

    def get(self, request, caregiver_id):
        caregiver = get_object_or_404(Caregiver, id=caregiver_id)
        if request.user.role.name == "administrator" and caregiver.state_id != request.user.state_id:
            return Response({"detail": "Forbidden: Caregiver outside state jurisdiction."}, status=status.HTTP_403_FORBIDDEN)

        docs = Document.objects.filter(owner_id=caregiver_id, deleted_at__isnull=True).select_related("document_type")
        return Response({"documents": DocumentMeSerializer(docs, many=True).data})

from rest_framework.parsers import BaseParser, MultiPartParser, FormParser

MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
ALLOWED_FILE_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}

def validate_uploaded_bytes(file_bytes: bytes, filename: str):
    """Enforces strict size limits and magic-byte signature validation."""
    if len(file_bytes) > MAX_UPLOAD_SIZE_BYTES:
        return False, "File exceeds maximum size limit of 15MB."
    if len(file_bytes) < 4:
        return False, "File is empty or corrupted."

    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_FILE_EXTENSIONS:
        return False, f"File extension '{ext}' is not permitted. Only PDF and standard image files are allowed."

    if ext == ".pdf" and not file_bytes.startswith(b"%PDF-"):
        return False, "File header does not match valid PDF signature."
    elif ext in (".jpg", ".jpeg") and not file_bytes.startswith(b"\xff\xd8"):
        return False, "File header does not match valid JPEG signature."
    elif ext == ".png" and not file_bytes.startswith(b"\x89PNG"):
        return False, "File header does not match valid PNG signature."

    return True, None

class RawMediaStreamParser(BaseParser):
    """Permits raw binary file streams with any MIME type (application/pdf, image/png, etc.)"""
    media_type = "*/*"

    def parse(self, stream, media_type=None, parser_context=None):
        return stream.read()

class DocumentFileUploadView(APIView):
    """
    PUT or POST /api/v1/documents/{id}/upload-file/
    Receives raw binary file stream or multipart/form-data file and stores it into Django media storage.
    """
    permission_classes = [permissions.AllowAny]
    parser_classes = [RawMediaStreamParser, MultiPartParser, FormParser]

    def put(self, request, id):
        return self._handle_upload(request, id)

    def post(self, request, id):
        return self._handle_upload(request, id)

    def _handle_upload(self, request, id):
        doc = get_object_or_404(Document, id=id, deleted_at__isnull=True)
        token = request.query_params.get("token")

        is_authorized = False
        if token and verify_document_token(str(doc.id), token, purpose="upload", max_age=storage_service.expiration):
            is_authorized = True
        elif request.user and request.user.is_authenticated:
            role_name = getattr(request.user.role, "name", None)
            if request.user.id == doc.owner_id:
                is_authorized = True
            elif role_name == "super_admin":
                is_authorized = True
            elif role_name == "administrator" and request.user.state_id == doc.state_id:
                is_authorized = True

        if not is_authorized:
            return Response({"detail": "Invalid or expired upload authorization."}, status=status.HTTP_403_FORBIDDEN)

        file_content = None
        if request.FILES:
            file_content = next(iter(request.FILES.values()))
        elif request.data and isinstance(request.data, (bytes, bytearray)):
            file_content = request.data
        elif getattr(request, "body", None):
            file_content = request.body

        if not file_content:
            return Response({"detail": "No file content received."}, status=status.HTTP_400_BAD_REQUEST)

        if hasattr(file_content, "read"):
            raw_bytes = file_content.read()
        elif isinstance(file_content, (bytes, bytearray)):
            raw_bytes = bytes(file_content)
        else:
            raw_bytes = str(file_content).encode("utf-8")

        filename = os.path.basename(doc.storage_path)
        is_valid, error_msg = validate_uploaded_bytes(raw_bytes, filename)
        if not is_valid:
            return Response({"detail": error_msg}, status=status.HTTP_400_BAD_REQUEST)

        storage_service.save_file(doc.storage_path, raw_bytes)
        doc.status = "pending_review"
        doc.save()

        record_audit_log(
            action="UPLOAD_DOCUMENT",
            table_name="documents",
            record_id=doc.id,
            request=request,
            entity_state=doc.state,
            new_values={"status": doc.status, "storage_path": doc.storage_path},
        )

        return Response(
            {
                "message": "File uploaded successfully to media storage.",
                "document_id": str(doc.id),
                "storage_path": doc.storage_path,
                "file_url": storage_service.generate_presigned_get_url(doc.storage_path, doc_id=doc.id),
            },
            status=status.HTTP_200_OK,
        )

class DocumentDirectFileView(APIView):
    """
    GET /api/v1/documents/{id}/file/
    Streams document file directly from Django media storage.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, id):
        doc = get_object_or_404(Document, id=id, deleted_at__isnull=True)
        token = request.query_params.get("token")

        is_authorized = False
        if token and verify_document_token(str(doc.id), token, purpose="download", max_age=storage_service.expiration):
            is_authorized = True
        elif request.user and request.user.is_authenticated:
            role_name = getattr(request.user.role, "name", None)
            if request.user.id == doc.owner_id:
                is_authorized = True
            elif role_name == "super_admin":
                is_authorized = True
            elif role_name == "administrator" and request.user.state_id == doc.state_id:
                is_authorized = True

        if not is_authorized:
            return Response({"detail": "You do not have permission to download this document."}, status=status.HTTP_403_FORBIDDEN)

        if not storage_service.exists(doc.storage_path):
            return Response({"detail": "File not found in media storage."}, status=status.HTTP_404_NOT_FOUND)

        record_audit_log(
            action="DOWNLOAD_DOCUMENT",
            table_name="documents",
            record_id=doc.id,
            request=request,
            entity_state=doc.state,
            new_values={"storage_path": doc.storage_path},
        )

        handle = storage_service.open_file(doc.storage_path, "rb")
        filename = os.path.basename(doc.storage_path)
        content_type, _ = mimetypes.guess_type(filename)
        content_type = content_type or "application/octet-stream"

        response = FileResponse(handle, content_type=content_type)
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response


class DocumentDownloadUrlView(APIView):
    """GET /api/v1/documents/{id}/download-url - Generates secure download URL."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id):
        doc = get_object_or_404(Document, id=id, deleted_at__isnull=True)
        user = request.user
        role_name = getattr(user.role, "name", None)

        # Authorization check: owner, or scoped administrator, or super admin
        if doc.owner_id != user.id:
            if role_name == "super_admin":
                pass
            elif role_name == "administrator" and user.state_id == doc.state_id:
                pass
            else:
                return Response({"detail": "You do not have permission to download this document."}, status=status.HTTP_403_FORBIDDEN)

        download_url = storage_service.generate_presigned_get_url(doc.storage_path, doc_id=doc.id)
        return Response(
            {
                "download_url": download_url,
                "expires_in_seconds": storage_service.expiration,
            },
            status=status.HTTP_200_OK,
        )

class AdminDocumentListView(ScopedStateQuerySetMixin, generics.ListAPIView):
    """GET /api/v1/admin/documents - Document review queue."""
    permission_classes = [IsStateScopedAdmin]
    serializer_class = DocumentSerializer
    queryset = Document.objects.filter(deleted_at__isnull=True).select_related("owner", "document_type", "state")

    def get_queryset(self):
        queryset = super().get_queryset()
        document_status = self.request.query_params.get("status")
        if document_status and document_status != "all":
            queryset = queryset.filter(status=document_status)
        return queryset

class AdminDocumentReviewView(APIView):
    """POST /api/v1/admin/documents/{document_id}/review"""
    permission_classes = [IsStateScopedAdmin]

    def post(self, request, document_id):
        doc = get_object_or_404(Document, id=document_id, deleted_at__isnull=True)
        if request.user.role.name == "administrator" and doc.state_id != request.user.state_id:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        serializer = DocumentReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        old_status = doc.status
        doc.status = serializer.validated_data["status"]
        doc.rejection_reason = serializer.validated_data.get("rejection_reason", "")
        doc.reviewed_at = timezone.now()
        doc.reviewed_by = request.user
        doc.save()

        record_audit_log(
            action="REVIEW_DOCUMENT",
            table_name="documents",
            record_id=doc.id,
            request=request,
            entity_state=doc.state,
            old_values={"status": old_status},
            new_values={"status": doc.status, "rejection_reason": doc.rejection_reason},
        )

        return Response(DocumentSerializer(doc).data, status=status.HTTP_200_OK)

class AdminDocumentRequirementsView(APIView):
    """GET/PUT /api/v1/admin/settings/document-requirements"""
    permission_classes = [IsStateScopedAdmin]

    def get(self, request):
        user = request.user
        qs = DocumentRequirement.objects.all().select_related("document_type", "state")
        if user.role.name == "administrator" and user.state_id:
            qs = qs.filter(state_id=user.state_id)
        return Response(DocumentRequirementSerializer(qs, many=True).data)

    def put(self, request):
        # Update or bulk toggle requirement
        data = request.data
        req_id = data.get("id")
        required = data.get("required", True)
        req = get_object_or_404(DocumentRequirement, id=req_id)
        
        if request.user.role.name == "administrator" and req.state_id != request.user.state_id:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        req.required = required
        req.save()
        return Response(DocumentRequirementSerializer(req).data)
