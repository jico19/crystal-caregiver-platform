import uuid
import logging
from apps.compliance.models import AuditLog
from apps.core.middleware import get_current_request, get_client_ip

logger = logging.getLogger(__name__)

# Security Whitelist & Sanitization rules (SECURITY_REQUIREMENTS.md Section 5.1)
AUDIT_WHITELIST = {
    "clients": ["status", "service_start_date", "admitted_by", "rejection_reason", "legal_hold"],
    "caregivers": ["first_name", "last_name", "phone", "state_id", "status", "legal_hold"],
    "authorizations": ["units_used", "status", "end_date", "total_units_authorized"],
    "users": ["status", "role_id", "state_id", "is_active"],
    "documents": ["status", "rejection_reason", "expiration_date", "legal_hold", "storage_path"],
    "care_plans": ["status", "primary_nurse", "effective_date"],
    "client_referrals": ["status", "handled_notes", "assigned_to_id", "converted_client_id"],
    "caregiver_applications": ["status", "rejection_reason", "notes", "reviewed_by"],
    "training_enrollments": ["status", "course_name", "completed_at"],
}


SENSITIVE_KEYS = {"password", "token", "signature_data", "ssn", "ssn_last4", "secret"}

def sanitize_audit_dict(table_name, data):
    """Sanitizes dict payload ensuring HIPAA compliance and stripping sensitive fields."""
    if not isinstance(data, dict):
        return None

    whitelist = AUDIT_WHITELIST.get(table_name)
    sanitized = {}
    for k, v in data.items():
        if k.lower() in SENSITIVE_KEYS:
            continue
        if whitelist is not None and k not in whitelist:
            continue
        sanitized[k] = str(v) if isinstance(v, uuid.UUID) else v
    return sanitized if sanitized else None

def record_audit_log(
    action: str,
    table_name: str,
    record_id: str,
    request=None,
    user=None,
    entity_state=None,
    old_values=None,
    new_values=None,
    ip_address=None,
    user_agent=None,
    request_id=None,
):
    """
    Creates an immutable, append-only AuditLog entry for administrative and compliance actions.
    """
    req = request or get_current_request()

    if req is not None:
        if user is None and hasattr(req, "user") and req.user.is_authenticated:
            user = req.user
        if ip_address is None:
            ip_address = get_client_ip(req)
        if user_agent is None:
            user_agent = req.META.get("HTTP_USER_AGENT", "")
        if request_id is None:
            request_id = getattr(req, "request_id", None)
        if entity_state is None:
            if hasattr(user, "state") and user.state:
                entity_state = user.state

    filtered_old = sanitize_audit_dict(table_name, old_values) if old_values else None
    filtered_new = sanitize_audit_dict(table_name, new_values) if new_values else None

    try:
        return AuditLog.objects.create(
            user=user,
            action=action,
            table_name=table_name,
            record_id=str(record_id),
            old_values=filtered_old,
            new_values=filtered_new,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id if isinstance(request_id, uuid.UUID) else None,
            entity_state=entity_state,
        )
    except Exception as e:
        logger.error(f"Failed to record audit log for {action} on {table_name}:{record_id} - {e}")
        return None
