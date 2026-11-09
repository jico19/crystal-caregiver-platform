import json
import hashlib
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.core.models import State, Role
from .models import Caregiver, CaregiverApplication

User = get_user_model()

def compute_content_hash(payload: dict, signed_name: str, signed_at_iso: str) -> str:
    """
    Computes cryptographic hash:
    SHA256(canonical_json(payload) || signed_name || signed_at)
    """
    canonical_payload = json.dumps(payload, sort_keys=True, separators=(',', ':'))
    hash_input = f"{canonical_payload}{signed_name}{signed_at_iso}".encode("utf-8")
    return hashlib.sha256(hash_input).hexdigest()

@transaction.atomic
def submit_caregiver_application(data: dict) -> CaregiverApplication:
    """
    Atomic transaction:
    1. Creates/updates user identity record with hashed password & caregiver role
    2. Upserts caregiver profile
    3. Creates submitted application record with SHA256 content hash
    """
    state_id = data["state_id"]
    state = State.objects.get(id=state_id)
    role, _ = Role.objects.get_or_create(name="caregiver")

    email = data["email"].strip().lower()
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "role": role,
            "state": state,
            "status": "active",
        }
    )
    if "password" in data and data["password"]:
        user.set_password(data["password"])
        user.role = role
        user.state = state
        user.status = "active"
        user.save()

    caregiver, _ = Caregiver.objects.update_or_create(
        id=user,
        defaults={
            "state": state,
            "first_name": data["first_name"],
            "last_name": data["last_name"],
            "phone": data.get("phone", ""),
            "address": data.get("address", ""),
            "date_of_birth": data.get("date_of_birth"),
            "ssn_last4": data.get("ssn_last4", ""),
        }
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
    content_hash = compute_content_hash(payload_to_hash, signed_name, signed_at.isoformat())

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
