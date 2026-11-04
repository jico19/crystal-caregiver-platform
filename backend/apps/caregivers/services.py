import hashlib
import json
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.compliance.audit import record_audit_log
from apps.core.models import Role, State
from .models import Caregiver, CaregiverApplication

User = get_user_model()

def compute_content_hash(payload: dict, signed_name: str, signed_at_iso: str) -> str:
    canonical_payload = json.dumps(payload, sort_keys=True, separators=(',', ':'))
    hash_input = f"{canonical_payload}{signed_name}{signed_at_iso}".encode("utf-8")
    return hashlib.sha256(hash_input).hexdigest()

def application_signed_payload(caregiver, notes, signature_data):
    """Bind every accepted application field and the signature to the digest."""
    return {
        "email": caregiver.id.email,
        "state_id": caregiver.state_id,
        "first_name": caregiver.first_name,
        "last_name": caregiver.last_name,
        "phone": caregiver.phone or "",
        "address": caregiver.address or "",
        "date_of_birth": caregiver.date_of_birth.isoformat() if caregiver.date_of_birth else None,
        "ssn_last4": caregiver.ssn_last4 or "",
        "notes": notes or "",
        "signature_data": signature_data,
    }


def _create_signed_application(caregiver, data, version, request=None):
    signed_at = timezone.now()
    notes = data.get("notes", "")
    signed_name = data.get("signed_name") or f"{caregiver.first_name} {caregiver.last_name}"
    application = CaregiverApplication.objects.create(
        caregiver=caregiver,
        state=caregiver.state,
        status="submitted",
        submitted_at=signed_at,
        notes=notes,
        signature_data=data["signature_data"],
        signed_name=signed_name,
        signed_at=signed_at,
        version=version,
        content_hash=compute_content_hash(
            application_signed_payload(caregiver, notes, data["signature_data"]),
            signed_name,
            signed_at.isoformat(),
        ),
    )
    record_audit_log(
        action="SUBMIT_CAREGIVER_APPLICATION" if version == 1 else "RESUBMIT_CAREGIVER_APPLICATION",
        table_name="caregiver_applications",
        record_id=application.id,
        request=request,
        user=caregiver.id,
        entity_state=caregiver.state,
        new_values={"status": application.status},
    )
    return application


@transaction.atomic
def submit_caregiver_application(data: dict, request=None) -> CaregiverApplication:
    """Create a new identity and application without changing an existing user."""
    email = data["email"].strip().lower()
    duplicate_error = {"email": "An account with this email already exists. Sign in to continue."}
    if User.objects.filter(email__iexact=email).exists():
        raise ValidationError(duplicate_error)
    try:
        state = State.objects.get(id=data["state_id"], active=True)
    except State.DoesNotExist:
        raise ValidationError({"state_id": "Select an active operating state."})
    role, _ = Role.objects.get_or_create(name="caregiver")
    try:
        # Roll back a concurrent duplicate before returning a validation response.
        with transaction.atomic():
            user = User.objects.create_user(
                email=email, password=data["password"], role=role, state=state, status="active",
            )
    except IntegrityError:
        if User.objects.filter(email__iexact=email).exists():
            raise ValidationError(duplicate_error)
        raise

    caregiver = Caregiver.objects.create(
        id=user,
        state=state,
        first_name=data["first_name"],
        last_name=data["last_name"],
        phone=data.get("phone", ""),
        address=data.get("address", ""),
        date_of_birth=data.get("date_of_birth"),
        ssn_last4=data.get("ssn_last4", ""),
    )
    return _create_signed_application(caregiver, data, version=1, request=request)


@transaction.atomic
def resubmit_caregiver_application(caregiver, data, request=None):
    caregiver = Caregiver.objects.select_for_update().select_related("id", "state").get(pk=caregiver.pk)
    previous = caregiver.applications.filter(deleted_at__isnull=True).order_by("-submitted_at", "-created_at").first()
    if previous and previous.status not in ("draft", "rejected"):
        raise ValidationError({"detail": "Your application is under review or approved and cannot be edited."})
    if "state_id" in data and data["state_id"] != caregiver.state_id:
        raise ValidationError({"state_id": "Your application must remain in your assigned state."})

    for field in ("first_name", "last_name", "phone", "address", "date_of_birth", "ssn_last4"):
        if field in data:
            setattr(caregiver, field, data[field])
    caregiver.save()
    if "notes" not in data:
        data = {**data, "notes": previous.notes if previous else ""}
    return _create_signed_application(
        caregiver, data, version=previous.version + 1 if previous else 1, request=request,
    )


def caregiver_credential_status(caregiver, *, documents=None, requirements=None):
    """Evaluate the configured requirements against current approved documents."""
    from apps.documents.models import Document, DocumentRequirement

    if requirements is None:
        requirements = DocumentRequirement.objects.filter(
            state_id=caregiver.state_id, for_role__in=["caregiver", "both"], required=True,
        ).select_related("document_type")
    if documents is None:
        documents = Document.objects.filter(
            owner_id=caregiver.pk, state_id=caregiver.state_id, deleted_at__isnull=True,
        ).select_related("document_type")
    today = date.today()
    warning_date = today + timedelta(days=30)
    valid = {}
    expired = set()
    for document in documents:
        name = document.document_type.name
        if document.status == "expired" or (
            document.status == "approved" and document.expiration_date and document.expiration_date < today
        ):
            expired.add(name)
        if document.status != "approved":
            continue
        if document.document_type.requires_expiration and not document.expiration_date:
            continue
        if document.expiration_date and document.expiration_date < today:
            continue
        # Any current approved copy satisfies its type, including a renewal.
        current = valid.get(name)
        if name not in valid or current is not None and (
            document.expiration_date is None or document.expiration_date > current
        ):
            valid[name] = document.expiration_date

    missing = sorted({requirement.document_type.name for requirement in requirements} - valid.keys())
    return {
        "compliant": not missing,
        "missing_requirements": missing,
        "approved": sorted(name for name, expiry in valid.items() if expiry is None or expiry > warning_date),
        "expiring_soon": sorted(name for name, expiry in valid.items() if expiry is not None and expiry <= warning_date),
        "expired": sorted(expired - valid.keys()),
    }
