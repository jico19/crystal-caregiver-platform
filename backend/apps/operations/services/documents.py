import hashlib
import json
from pathlib import Path
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError, PermissionDenied
from apps.accounts.access import admin_branches
from ..models import BranchDocumentRequirement, Document, DocumentVersion, DocumentReview
from ..private_files import FIXTURES, write_private
from .common import subject, audit, Conflict, retry_locked

MAX_BYTES = 5_242_880


# Represent the synthetic upload size limit as an HTTP 413 error.
class TooLarge(APIException):
    status_code = 413
    default_code = "too_large"
    default_detail = "Demo files must be at most 5 MiB."


# Represent unsupported upload formats or signatures as an HTTP 415 error.
class UnsupportedMedia(APIException):
    status_code = 415
    default_code = "unsupported_media"
    default_detail = "Use a bundled PDF, PNG or JPEG fixture."


# Check size, type, signature, category and exact bundled-fixture digest before storing bytes.
def fixture_bytes(data):
    file = data["file"]
    if file.size > MAX_BYTES:
        raise TooLarge()
    manifest = {row["fixture_id"]: row for row in json.loads((FIXTURES / "manifest.json").read_text())}
    fixture = manifest.get(data["fixture_id"])
    if not fixture or fixture["category"] != data["document_type"]:
        raise ValidationError({"fixture_id": "Choose a bundled fixture for this category."})
    suffix = Path(file.name).suffix.lower()
    if suffix != Path(fixture["filename"]).suffix or file.content_type != fixture["media_type"]:
        raise UnsupportedMedia()
    value = bytearray()
    file.seek(0)
    for chunk in file.chunks():
        value.extend(chunk)
        if len(value) > MAX_BYTES:
            raise TooLarge()
    signatures = {".pdf": b"%PDF-", ".png": b"\x89PNG\r\n\x1a\n", ".jpg": b"\xff\xd8\xff"}
    if not value or not value.startswith(signatures[suffix]):
        raise UnsupportedMedia()
    if len(value) != fixture["byte_size"] or hashlib.sha256(value).hexdigest() != fixture["sha256"]:
        raise ValidationError({"file": "Only exact bundled synthetic fixture bytes are accepted."})
    return fixture, bytes(value)


# Authorize ownership, apply configurable date rules, and create an audited version with cleanup.
@retry_locked
def upload_document(actor, caregiver_id, data):
    path = None
    try:
        with transaction.atomic():
            caregiver = subject(actor, caregiver_id, owner=True)
            if not data["demo_acknowledged"]:
                raise ValidationError({"demo_acknowledged": "Acknowledge synthetic data only."})
            requirement = get_object_or_404(BranchDocumentRequirement.objects.select_related("document_type"), branch=caregiver.branch, document_type__code=data["document_type"], document_type__audience="caregiver", document_type__active=True, active=True)
            issued, expiry = data.get("issued_on"), data.get("expires_on")
            if requirement.tracks_expiration and not expiry:
                raise ValidationError({"expires_on": "An expiration date is required by this demo configuration."})
            if not requirement.tracks_expiration and (issued or expiry):
                raise ValidationError("This category does not track dates.")
            if issued and expiry and issued > expiry:
                raise ValidationError({"issued_on": "Issue date must not follow expiration."})
            fixture, value = fixture_bytes(data)
            document, _ = Document.objects.get_or_create(branch=caregiver.branch, caregiver=caregiver, document_type=requirement.document_type)
            latest = document.documentversion_set.order_by("-version_number").first()
            stored, path = write_private(caregiver.branch, actor, fixture["filename"], fixture["media_type"], value)
            version = DocumentVersion.objects.create(branch=caregiver.branch, document=document, version_number=(latest.version_number + 1 if latest else 1), file=stored, issued_on=issued, expires_on=expiry, submitted_at=timezone.now())
            audit(actor, "document.uploaded", version, caregiver.branch, "document", {"document": str(document.public_id)})
        return version
    except Exception:
        # Database rollback cannot remove filesystem bytes, so failed uploads clean their own new file.
        if path:
            path.unlink(missing_ok=True)
        raise


# Lock the authorized version and atomically record a non-stale terminal decision and audit.
@retry_locked
@transaction.atomic
def review_document(actor, version_id, data):
    if not admin_branches(actor).exists():
        raise PermissionDenied("Administrator assignment required.")
    version = get_object_or_404(DocumentVersion.objects.select_related("document__caregiver"), public_id=version_id, branch__in=admin_branches(actor), document__caregiver__active=True)
    caregiver = subject(actor, version.document.caregiver.public_id, management=True)
    version = DocumentVersion.objects.select_for_update().get(pk=version.pk)
    if version.review_status != data["expected_status"]:
        raise Conflict()
    if data["decision"] == "rejected" and not data["comment"].strip():
        raise ValidationError({"comment": "A rejection reason is required."})
    version.review_status = data["decision"]
    version.save(update_fields=["review_status", "updated_at"])
    DocumentReview.objects.create(branch=caregiver.branch, document_version=version, reviewer=actor, decision=data["decision"], comment=data["comment"], reviewed_at=timezone.now())
    audit(actor, "document.reviewed", version, caregiver.branch, "document", {"decision": data["decision"]})
    return version
