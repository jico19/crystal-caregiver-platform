from dataclasses import dataclass
from datetime import date, timedelta
import uuid

from apps.compliance.audit import record_audit_log
from apps.core.storage import storage_service

from .models import Document, DocumentRequirement


@dataclass(frozen=True)
class DocumentUploadIntent:
    document: Document
    upload_url: str
    expires_in_seconds: int


@dataclass(frozen=True)
class DocumentUploadResult:
    document: Document
    file_url: str


def allocate_document_upload(*, owner, document_type, validated_data):
    """
    Allocate the existing storage key/URL and pending record for an
    owner.

    The API verifies the owner's state and document type before
    delegating. URL generation precedes record creation, as before; no
    bytes are stored.
    """
    state = owner.state
    doc_id = uuid.uuid4()
    storage_key = (
        f"documents/{state.code}/{owner.id}/"
        f"{doc_id}_{validated_data['filename']}"
    )
    upload_url = storage_service.generate_presigned_put_url(
        storage_key=storage_key,
        content_type=validated_data.get("content_type", "application/pdf"),
        doc_id=doc_id,
    )
    document = Document.objects.create(
        id=doc_id,
        owner=owner,
        document_type=document_type,
        state=state,
        storage_path=storage_key,
        status="pending_review",
        expiration_date=validated_data.get("expiration_date"),
    )
    return DocumentUploadIntent(
        document=document,
        upload_url=upload_url,
        expires_in_seconds=storage_service.expiration,
    )


def upload_document_file(
    *,
    document,
    validated_bytes,
    actor=None,
    ip_address=None,
    user_agent=None,
    request_id=None,
):
    """
    Store authorized, validated bytes, then status, audit and download
    URL.

    Preserve the existing non-atomic storage boundary: storage errors
    propagate before any status write/audit; database errors can leave
    saved bytes behind. Auditing remains best effort. URL errors occur
    after bytes/status/audit. A database transaction cannot roll back
    external storage, so this extraction deliberately does not wrap the
    workflow in a new transaction.
    """
    storage_service.save_file(document.storage_path, validated_bytes)
    document.status = "pending_review"
    document.save()

    record_audit_log(
        action="UPLOAD_DOCUMENT",
        table_name="documents",
        record_id=document.id,
        user=actor,
        entity_state=document.state,
        new_values={
            "status": document.status,
            "storage_path": document.storage_path,
        },
        ip_address=ip_address,
        user_agent=user_agent,
        request_id=request_id,
    )
    file_url = storage_service.generate_presigned_get_url(
        document.storage_path,
        doc_id=document.id,
    )
    return DocumentUploadResult(document=document, file_url=file_url)


@dataclass(frozen=True)
class DocumentCompliancePolicy:
    check_expiration: bool
    expiring_soon_satisfies_requirement: bool
    expired_documents_block_compliance: bool


# Compatibility policies: these differences are existing endpoint
# behavior.
CAREGIVER_CREDENTIAL_POLICY = DocumentCompliancePolicy(
    check_expiration=True,
    expiring_soon_satisfies_requirement=True,
    expired_documents_block_compliance=True,
)
CLIENT_DOCUMENT_POLICY = DocumentCompliancePolicy(
    check_expiration=True,
    expiring_soon_satisfies_requirement=False,
    expired_documents_block_compliance=True,
)
ADMIN_CAREGIVER_POLICY = DocumentCompliancePolicy(
    check_expiration=False,
    expiring_soon_satisfies_requirement=True,
    expired_documents_block_compliance=False,
)


@dataclass(frozen=True)
class ComplianceDocumentType:
    id: int
    name: str


@dataclass(frozen=True)
class DocumentComplianceResult:
    required_types: tuple[ComplianceDocumentType, ...]
    missing_types: tuple[ComplianceDocumentType, ...]
    approved: tuple[ComplianceDocumentType, ...]
    expiring_soon: tuple[ComplianceDocumentType, ...]
    expired: tuple[ComplianceDocumentType, ...]
    compliant: bool


def calculate_document_compliance(
    *,
    owner,
    state,
    role: str,
    evaluation_date: date,
    policy: DocumentCompliancePolicy,
) -> DocumentComplianceResult:
    """
    Evaluate owner uploads against state/role requirements without
    writes.

    The caller supplies the date and endpoint policy. Expiry includes
    today through day 30; replacements do not hide older records.
    Uploads retain owner-only state scoping, independently of
    requirement state scoping.
    """
    requirements = DocumentRequirement.objects.filter(
        state=state,
        for_role__in=[role, "both"],
        required=True,
    ).select_related("document_type")
    documents = Document.objects.filter(
        owner=owner,
        deleted_at__isnull=True,
    ).select_related("document_type")

    approved = []
    expired = []
    expiring_soon = []
    window_end = evaluation_date + timedelta(days=30)
    for document in documents:
        document_type = ComplianceDocumentType(
            id=document.document_type_id,
            name=document.document_type.name,
        )
        if document.status == "expired":
            expired.append(document_type)
        elif document.status == "approved":
            expiry = (
                document.expiration_date if policy.check_expiration else None
            )
            if expiry and expiry < evaluation_date:
                expired.append(document_type)
            elif expiry and expiry <= window_end:
                expiring_soon.append(document_type)
            else:
                approved.append(document_type)

    satisfied_ids = {document_type.id for document_type in approved}
    if policy.expiring_soon_satisfies_requirement:
        satisfied_ids.update(
            document_type.id for document_type in expiring_soon
        )
    required_types = tuple(
        ComplianceDocumentType(
            id=requirement.document_type_id,
            name=requirement.document_type.name,
        )
        for requirement in requirements
    )
    missing_types = tuple(
        document_type
        for document_type in required_types
        if document_type.id not in satisfied_ids
    )
    return DocumentComplianceResult(
        required_types=required_types,
        missing_types=missing_types,
        approved=tuple(approved),
        expiring_soon=tuple(expiring_soon),
        expired=tuple(expired),
        compliant=(
            not missing_types
            and not (policy.expired_documents_block_compliance and expired)
        ),
    )
