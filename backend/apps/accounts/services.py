"""Account workflows; all emails use the configured local/test transport."""

import hashlib
import secrets
import uuid
from datetime import timedelta
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework.exceptions import PermissionDenied, ValidationError
from apps.operations.models import AgencyAdmin, BranchStaff, Client, AuditEvent
from .access import admin_branches
from .models import Invitation, User


def audit(user, action, resource_id, branch=None):
    AuditEvent.objects.create(
        actor=user if user and user.is_authenticated else None,
        action=action,
        resource_type="account",
        resource_id=resource_id,
        branch=branch,
        occurred_at=timezone.now(),
        safe_metadata={},
    )


def create_user(email, password):
    email = email.strip().lower()
    if User.objects.filter(email__iexact=email).exists():
        raise ValidationError(
            {"email": "Unable to create account. Sign in or reset your password."}
        )
    try:
        with transaction.atomic():
            return User.objects.create_user(
                username=uuid.uuid4().hex, email=email, password=password
            )
    except IntegrityError:
        raise ValidationError(
            {"email": "Unable to create account. Sign in or reset your password."}
        )


def email_link(email, subject, path):
    send_mail(
        subject,
        f"Synthetic demo only. Open {settings.FRONTEND_ORIGIN}{path}",
        settings.DEFAULT_FROM_EMAIL,
        [email],
    )


@transaction.atomic
def invite(actor, data):
    branch = admin_branches(actor).filter(public_id=data["branch"]).first()
    if not branch:
        raise PermissionDenied("Branch access denied.")
    if (
        data["role"] == "administrator"
        and not AgencyAdmin.objects.filter(user=actor, agency=branch.agency, active=True).exists()
    ):
        raise PermissionDenied("Only agency administrators may invite state administrators.")
    token = secrets.token_urlsafe(32)
    invitation = Invitation.objects.create(
        email=data["email"].lower(),
        branch=branch,
        role=data["role"],
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        created_by=actor,
        expires_at=timezone.now() + timedelta(hours=24),
    )
    audit(actor, "invitation.created", invitation.public_id, branch)
    transaction.on_commit(
        lambda: email_link(
            invitation.email, "Demo portal invitation", f"/accept-invitation?token={token}"
        )
    )
    return invitation


@transaction.atomic
def accept_invitation(data, signed_in_user):
    invitation = (
        Invitation.objects.select_for_update()
        .filter(
            token_hash=hashlib.sha256(data["token"].encode()).hexdigest(),
            accepted_at=None,
            expires_at__gt=timezone.now(),
            branch__active=True,
        )
        .select_related("branch", "created_by")
        .first()
    )
    if (
        not invitation
        or not admin_branches(invitation.created_by).filter(pk=invitation.branch_id).exists()
    ):
        raise ValidationError("Invitation is invalid or expired.")
    if (
        invitation.role == "administrator"
        and not AgencyAdmin.objects.filter(
            user=invitation.created_by, active=True, agency_id=invitation.branch.agency_id
        ).exists()
    ):
        raise ValidationError("Invitation is invalid or expired.")
    existing = User.objects.filter(email__iexact=invitation.email).first()
    if existing:
        if not signed_in_user.is_authenticated or signed_in_user.pk != existing.pk:
            raise ValidationError(
                "Sign in to your existing account before accepting this invitation."
            )
        user = existing
    else:
        user = create_user(invitation.email, data["password"])
    if invitation.role == "client":
        Client.objects.get_or_create(
            user=user,
            branch=invitation.branch,
            defaults={"name": data["name"], "email": invitation.email},
        )
    else:
        if (
            BranchStaff.objects.filter(user=user, role="administrator", active=True)
            .exclude(branch=invitation.branch)
            .exists()
        ):
            raise ValidationError("This account already administers another state.")
        BranchStaff.objects.update_or_create(
            user=user, branch=invitation.branch, defaults={"role": "administrator", "active": True}
        )
    invitation.accepted_at = timezone.now()
    invitation.save(update_fields=["accepted_at"])
    audit(user, "invitation.accepted", invitation.public_id, invitation.branch)
    return user


def request_reset(email):
    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if user and user.has_usable_password():
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        email_link(user.email, "Demo password reset", f"/reset-password?uid={uid}&token={token}")


def confirm_reset(data):
    """Verify a reset token, replace the active account's password, and audit it."""
    try:
        user = User.objects.get(pk=urlsafe_base64_decode(data["uid"]).decode(), is_active=True)
    except User.DoesNotExist, ValueError, UnicodeError, OverflowError:
        raise ValidationError("Reset link is invalid or expired.")
    if not default_token_generator.check_token(user, data["token"]):
        raise ValidationError("Reset link is invalid or expired.")
    user.set_password(data["password"])
    user.save(update_fields=["password"])
    audit(user, "password.reset", uuid.uuid5(uuid.NAMESPACE_OID, str(user.pk)))
