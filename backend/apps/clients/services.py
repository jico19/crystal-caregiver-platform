import hashlib
import json

from django.db import transaction
from django.utils import timezone

from apps.compliance.audit import record_audit_log

from .models import Client, ClientAgreement

STATUTORY_AGREEMENT_TITLES = {
    "general_care_terms_v1": (
        "Home Health Services Agreement & Patient Bill of Rights"
    ),
    "care_agreement": "Home Care Agreement & Terms of Service",
    "hipaa_disclosure": "HIPAA Privacy Notice & Health Data Disclosure",
    "client_rights": "Client Rights & Responsibilities Notice",
    "advance_directives": (
        "Advance Directives & Healthcare Proxy Acknowledgement"
    ),
}


def submit_client_intake(*, owner, validated_data):
    """
    Persist intake using the authorized identity's owner and state.
    """
    return Client.objects.update_or_create(
        id=owner,
        defaults={
            "state": owner.state,
            "first_name": validated_data["first_name"],
            "last_name": validated_data["last_name"],
            "date_of_birth": validated_data["date_of_birth"],
            "phone": validated_data.get("phone", ""),
            "address": validated_data.get("address", ""),
            "medicaid_number": validated_data.get("medicaid_number", ""),
            "signature_data": validated_data["signature_data"],
            "signed_name": validated_data["signed_name"],
            "signed_at": timezone.now(),
            "status": "pending",
        },
    )


def list_latest_client_agreements(*, owner):
    """
    Keep the most recently created record per key, in creation order.
    """
    agreements = ClientAgreement.objects.filter(client=owner).order_by(
        "-created_at",
    )
    seen_keys = set()
    latest = []
    for agreement in agreements:
        if agreement.agreement_key not in seen_keys:
            seen_keys.add(agreement.agreement_key)
            latest.append(agreement)
    return latest


def sign_client_agreement(*, client, key, validated_data):
    """
    Append a signature with the existing canonical content and version
    rules.

    Version allocation retains the existing read-then-insert race.
    Serializing concurrent signings/adding a uniqueness constraint is a
    separate change. Historical rows are never updated or rehashed here.
    """
    signed_at = timezone.now()
    signed_name = validated_data["signed_name"]
    body = (
        f"Standard statutory {key} agreement terms for "
        f"{client.state.name} jurisdiction."
    )
    payload_to_hash = {
        "agreement_key": key,
        "client_id": str(client.pk),
        "state_id": client.state.id,
        "body": body,
    }
    canonical_json = json.dumps(
        payload_to_hash,
        sort_keys=True,
        separators=(',', ':'),
    )
    hash_input = (
        f"{canonical_json}{signed_name}{signed_at.isoformat()}".encode("utf-8")
    )
    content_hash = hashlib.sha256(hash_input).hexdigest()

    existing = (
        ClientAgreement.objects.filter(
            client_id=client.pk,
            agreement_key=key,
        )
        .order_by("-version")
        .first()
    )
    if (
        existing
        and existing.title
        and existing.title != "General Care Terms V1"
    ):
        title = existing.title
        next_version = (existing.version or 1) + 1
    elif key in STATUTORY_AGREEMENT_TITLES:
        title = f"{client.state.code} {STATUTORY_AGREEMENT_TITLES[key]}"
        next_version = (existing.version + 1) if existing else 1
    else:
        title = key.replace("_", " ").title()
        next_version = (existing.version + 1) if existing else 1

    return ClientAgreement.objects.create(
        client_id=client.pk,
        state=client.state,
        agreement_key=key,
        title=title,
        version=next_version,
        body=body,
        signature_data=validated_data["signature_data"],
        signed_name=signed_name,
        signed_at=signed_at,
        content_hash=content_hash,
    )


@transaction.atomic
def admit_client(
    client: Client,
    *,
    actor,
    status,
    service_start_date,
    admission_notes,
    rejection_reason,
    ip_address=None,
    user_agent=None,
    request_id=None,
) -> Client:
    """
    Apply a validated admission together with its required audit log.
    """
    old_status = client.status
    client.status = status
    client.service_start_date = service_start_date
    client.admission_notes = admission_notes
    client.rejection_reason = rejection_reason
    client.admitted_by = actor
    client.admitted_at = timezone.now()
    client.save()

    audit_log = record_audit_log(
        action=(
            "ADMIT_CLIENT"
            if client.status in ("approved", "active")
            else "REJECT_CLIENT"
        ),
        table_name="clients",
        record_id=client.pk,
        user=actor,
        entity_state=client.state,
        old_values={"status": old_status},
        new_values={
            "status": client.status,
            "service_start_date": (
                client.service_start_date.isoformat()
                if client.service_start_date
                else None
            ),
            "rejection_reason": client.rejection_reason,
        },
        ip_address=ip_address,
        user_agent=user_agent,
        request_id=request_id,
    )
    if audit_log is None:
        raise RuntimeError(
            "Unable to record required client admission audit log."
        )
    return client
