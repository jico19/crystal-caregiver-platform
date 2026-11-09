from datetime import date
import mimetypes
import os

from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, permissions, generics
from rest_framework.parsers import BaseParser, MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.caregivers.models import Caregiver
from apps.clients.models import Client
from apps.compliance.audit import record_audit_log
from apps.core.middleware import get_client_ip
from apps.core.mixins import ScopedStateQuerySetMixin
from apps.core.permissions import IsStateScopedAdmin, IsClient
from apps.core.storage import storage_service, verify_document_token

from .models import DocumentType, DocumentRequirement, Document
from .serializers import (
    DocumentTypeSerializer,
    DocumentRequirementSerializer,
    DocumentSerializer,
    DocumentMeSerializer,
    UploadIntentSerializer,
    DocumentReviewSerializer,
)
from .services import (
    CLIENT_DOCUMENT_POLICY,
    calculate_document_compliance,
    allocate_document_upload,
    upload_document_file,
)
from .validators import validate_uploaded_bytes


class DocumentTypesListView(APIView):
    """GET /api/v1/documents/types"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        types = DocumentType.objects.all()
        return Response(DocumentTypeSerializer(types, many=True).data)


class DocumentUploadIntentView(APIView):
    """
    POST /api/v1/documents/upload-intent - Allocates document record and
    presigned upload URL.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = UploadIntentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user
        doc_type = get_object_or_404(DocumentType, id=data["document_type_id"])

        # Determine jurisdiction
        state = user.state
        if not state:
            return Response(
                {
                    "detail": (
                        "User is not mapped to an active state jurisdiction."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        intent = allocate_document_upload(
            owner=user,
            document_type=doc_type,
            validated_data=data,
        )

        return Response(
            {
                "document_id": str(intent.document.id),
                "upload_url": intent.upload_url,
                "expires_in_seconds": intent.expires_in_seconds,
            },
            status=status.HTTP_200_OK,
        )


class DocumentMeListView(APIView):
    """
    GET /api/v1/documents/me - The authenticated user's document
    records.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        docs = Document.objects.filter(
            owner=request.user, deleted_at__isnull=True
        ).select_related("document_type")
        return Response(
            {"documents": DocumentMeSerializer(docs, many=True).data}
        )


class ClientDocumentStatusView(APIView):
    """
    GET /api/v1/clients/me/document-status - Compliance overview for a
    client.
    """

    permission_classes = [IsClient]

    def get(self, request):
        client = get_object_or_404(Client, id=request.user)
        result = calculate_document_compliance(
            owner=request.user,
            state=client.state,
            role="client",
            evaluation_date=date.today(),
            policy=CLIENT_DOCUMENT_POLICY,
        )

        required_types = [
            {"document_type_id": item.id, "name": item.name}
            for item in result.required_types
        ]
        missing = [
            {"document_type_id": item.id, "name": item.name}
            for item in result.missing_types
        ]

        return Response(
            {
                "summary": {
                    "missing": len(missing),
                    "expired": len(result.expired),
                    "expiring_soon": len(result.expiring_soon),
                    "compliant": result.compliant,
                },
                "compliant": result.compliant,
                "required_types": required_types,
                "missing": missing,
                "expired": [item.name for item in result.expired],
                "expiring_soon": [item.name for item in result.expiring_soon],
            }
        )


class AdminCaregiverDocumentsView(APIView):
    """GET /api/v1/admin/caregivers/{caregiver_id}/documents"""

    permission_classes = [IsStateScopedAdmin]

    def get(self, request, caregiver_id):
        caregiver = get_object_or_404(Caregiver, id=caregiver_id)
        if (
            request.user.role.name == "administrator"
            and caregiver.state_id != request.user.state_id
        ):
            return Response(
                {"detail": "Forbidden: Caregiver outside state jurisdiction."},
                status=status.HTTP_403_FORBIDDEN,
            )

        docs = Document.objects.filter(
            owner_id=caregiver_id, deleted_at__isnull=True
        ).select_related("document_type")
        return Response(
            {"documents": DocumentMeSerializer(docs, many=True).data}
        )


class RawMediaStreamParser(BaseParser):
    """
    Permits raw binary file streams with any MIME type (application/pdf,
    image/png, etc.)
    """

    media_type = "*/*"

    def parse(self, stream, media_type=None, parser_context=None):
        return stream.read()


class DocumentFileUploadView(APIView):
    """
    PUT or POST /api/v1/documents/{id}/upload-file/ Receives raw binary
    file stream or multipart/form-data file and stores it into Django
    media storage.
    """

    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser, RawMediaStreamParser]

    def put(self, request, id):
        return self._handle_upload(request, id)

    def post(self, request, id):
        return self._handle_upload(request, id)

    def _handle_upload(self, request, id):
        doc = get_object_or_404(Document, id=id, deleted_at__isnull=True)
        token = request.query_params.get("token")

        is_authorized = False
        if token and verify_document_token(str(doc.id), token):
            is_authorized = True
        elif request.user and request.user.is_authenticated:
            role_name = getattr(request.user.role, "name", None)
            if request.user.id == doc.owner_id:
                is_authorized = True
            elif role_name == "super_admin":
                is_authorized = True
            elif (
                role_name == "administrator"
                and request.user.state_id == doc.state_id
            ):
                is_authorized = True

        if not is_authorized:
            return Response(
                {"detail": "Invalid or expired upload authorization."},
                status=status.HTTP_403_FORBIDDEN,
            )

        file_content = None
        if request.FILES:
            file_content = next(iter(request.FILES.values()))
        elif request.data and isinstance(request.data, (bytes, bytearray)):
            file_content = request.data
        elif getattr(request, "body", None):
            file_content = request.body

        if not file_content:
            return Response(
                {"detail": "No file content received."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if hasattr(file_content, "read"):
            raw_bytes = file_content.read()
        elif isinstance(file_content, (bytes, bytearray)):
            raw_bytes = bytes(file_content)
        else:
            raw_bytes = str(file_content).encode("utf-8")

        filename = os.path.basename(doc.storage_path)
        is_valid, error_msg = validate_uploaded_bytes(raw_bytes, filename)
        if not is_valid:
            return Response(
                {"detail": error_msg}, status=status.HTTP_400_BAD_REQUEST
            )

        result = upload_document_file(
            document=doc,
            validated_bytes=raw_bytes,
            actor=request.user if request.user.is_authenticated else None,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            request_id=getattr(request, "request_id", None),
        )

        return Response(
            {
                "message": "File uploaded successfully to media storage.",
                "document_id": str(result.document.id),
                "storage_path": result.document.storage_path,
                "file_url": result.file_url,
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
        if token and verify_document_token(str(doc.id), token):
            is_authorized = True
        elif request.user and request.user.is_authenticated:
            role_name = getattr(request.user.role, "name", None)
            if request.user.id == doc.owner_id:
                is_authorized = True
            elif role_name == "super_admin":
                is_authorized = True
            elif (
                role_name == "administrator"
                and request.user.state_id == doc.state_id
            ):
                is_authorized = True

        if not is_authorized:
            return Response(
                {
                    "detail": (
                        "You do not have permission to download this document."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not storage_service.exists(doc.storage_path):
            return Response(
                {"detail": "File not found in media storage."},
                status=status.HTTP_404_NOT_FOUND,
            )

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
    """
    GET /api/v1/documents/{id}/download-url - Generates secure download
    URL.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id):
        doc = get_object_or_404(Document, id=id, deleted_at__isnull=True)
        user = request.user
        role_name = getattr(user.role, "name", None)

        # Authorization check: owner, or scoped administrator, or super
        # admin
        if doc.owner_id != user.id:
            if role_name == "super_admin":
                pass
            elif (
                role_name == "administrator" and user.state_id == doc.state_id
            ):
                pass
            else:
                return Response(
                    {
                        "detail": (
                            "You do not have permission "
                            "to download this document."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        download_url = storage_service.generate_presigned_get_url(
            doc.storage_path, doc_id=doc.id
        )
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
    queryset = Document.objects.filter(deleted_at__isnull=True).select_related(
        "owner", "document_type", "state"
    )


class AdminDocumentReviewView(APIView):
    """POST /api/v1/admin/documents/{document_id}/review"""

    permission_classes = [IsStateScopedAdmin]

    def post(self, request, document_id):
        doc = get_object_or_404(
            Document, id=document_id, deleted_at__isnull=True
        )
        if (
            request.user.role.name == "administrator"
            and doc.state_id != request.user.state_id
        ):
            return Response(
                {"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN
            )

        serializer = DocumentReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_status = doc.status
        doc.status = serializer.validated_data["status"]
        doc.rejection_reason = serializer.validated_data.get(
            "rejection_reason", ""
        )
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
            new_values={
                "status": doc.status,
                "rejection_reason": doc.rejection_reason,
            },
        )

        return Response(
            DocumentSerializer(doc).data, status=status.HTTP_200_OK
        )


class AdminDocumentRequirementsView(APIView):
    """GET/PUT /api/v1/admin/settings/document-requirements"""

    permission_classes = [IsStateScopedAdmin]

    def get(self, request):
        user = request.user
        qs = DocumentRequirement.objects.all().select_related(
            "document_type", "state"
        )
        if user.role.name == "administrator" and user.state_id:
            qs = qs.filter(state_id=user.state_id)
        return Response(DocumentRequirementSerializer(qs, many=True).data)

    def put(self, request):
        # Update or bulk toggle requirement
        data = request.data
        req_id = data.get("id")
        required = data.get("required", True)
        req = get_object_or_404(DocumentRequirement, id=req_id)

        if (
            request.user.role.name == "administrator"
            and req.state_id != request.user.state_id
        ):
            return Response(
                {"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN
            )

        req.required = required
        req.save()
        return Response(DocumentRequirementSerializer(req).data)
