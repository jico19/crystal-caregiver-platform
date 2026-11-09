import hashlib
import json

from django.contrib.auth import get_user_model
from django.db import IntegrityError, connection, transaction
from django.utils import timezone

from apps.compliance.audit import record_audit_log
from apps.core.models import Role, State

from .models import Caregiver, CaregiverApplication

User = get_user_model()


class ApplicationEmailConflict(ValueError):
    """Public applications cannot reuse an existing identity."""


def _is_email_unique_violation(error: IntegrityError) -> bool:
    cause = error.__cause__
    if connection.vendor == "sqlite":
        return str(cause) == "UNIQUE constraint failed: users.email"
    if connection.vendor == "postgresql":
        if getattr(cause, "pgcode", None) != "23505":
            return False
        diagnostic = cause.diag
        if diagnostic.table_name != User._meta.db_table:
            return False
        with connection.cursor() as cursor:
            constraints = connection.introspection.get_constraints(
                cursor,
                User._meta.db_table,
            )
        constraint = constraints.get(diagnostic.constraint_name, {})
        return constraint.get("unique", False) and constraint.get(
            "columns"
        ) == ["email"]
    return False


def compute_content_hash(
    payload: dict, signed_name: str, signed_at_iso: str
) -> str:
    """
    Computes cryptographic hash:
    SHA256(canonical_json(payload) || signed_name || signed_at)
    """
    canonical_payload = json.dumps(
        payload, sort_keys=True, separators=(',', ':')
    )
    hash_input = f"{canonical_payload}{signed_name}{signed_at_iso}".encode(
        "utf-8"
    )
    return hashlib.sha256(hash_input).hexdigest()


@transaction.atomic
def submit_caregiver_application(data: dict) -> CaregiverApplication:
    """
    Create a new identity, profile, and signed application atomically.
    Existing identities are never changed by public applications.
    """
    email = User.objects.normalize_email(data["email"]).lower()
    if User.objects.filter(email__iexact=email).exists():
        raise ApplicationEmailConflict

    state_id = data["state_id"]
    state = State.objects.get(id=state_id)
    role, _ = Role.objects.get_or_create(name="caregiver")

    try:
        # Roll back a failed insert before inspecting the uniqueness
        # conflict.
        with transaction.atomic():
            user = User.objects.create_user(
                email=email,
                password=data["password"],
                role=role,
                state=state,
                status="active",
            )
    except IntegrityError as error:
        if _is_email_unique_violation(error):
            raise ApplicationEmailConflict from error
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

    signed_at = timezone.now()
    signed_name = data["signed_name"]
    payload_to_hash = {
        "email": email,
        "first_name": data["first_name"],
        "last_name": data["last_name"],
        "state_id": state_id,
        "date_of_birth": str(data.get("date_of_birth", "")),
        "ssn_last4": data.get("ssn_last4", ""),
    }
    content_hash = compute_content_hash(
        payload_to_hash, signed_name, signed_at.isoformat()
    )

    application = CaregiverApplication.objects.create(
        caregiver=caregiver,
        state=state,
        status="submitted",
        submitted_at=signed_at,
        signature_data=data["signature_data"],
        signed_name=signed_name,
        signed_at=signed_at,
        version=1,
        content_hash=content_hash,
    )
    return application


@transaction.atomic
def review_caregiver_application(
    application: CaregiverApplication,
    *,
    actor,
    status,
    notes,
    rejection_reason,
    ip_address=None,
    user_agent=None,
    request_id=None,
) -> CaregiverApplication:
    """Apply a validated review together with its required audit log."""
    old_status = application.status
    application.status = status
    application.notes = notes
    application.rejection_reason = rejection_reason
    application.reviewed_at = timezone.now()
    application.reviewed_by = actor
    application.save()

    audit_log = record_audit_log(
        action="REVIEW_CAREGIVER_APPLICATION",
        table_name="caregiver_applications",
        record_id=application.pk,
        user=actor,
        entity_state=application.state,
        old_values={"status": old_status},
        new_values={
            "status": application.status,
            "rejection_reason": application.rejection_reason,
            "notes": application.notes,
        },
        ip_address=ip_address,
        user_agent=user_agent,
        request_id=request_id,
    )
    if audit_log is None:
        raise RuntimeError(
            "Unable to record required caregiver review audit log."
        )
    return application
