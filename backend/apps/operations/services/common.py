import time
from functools import wraps
from django.db import OperationalError
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import APIException, PermissionDenied
from apps.accounts.access import admin_branches, scope_people
from ..models import Caregiver, AuditEvent


class Conflict(APIException):
    status_code = 409
    default_code = "conflict"
    default_detail = "The record changed or this action is unavailable. Refresh and try again."


def retry_locked(function):
    @wraps(function)
    def run(*args, **kwargs):
        for attempt in range(8):
            try:
                return function(*args, **kwargs)
            except OperationalError as exc:
                if "locked" not in str(exc).lower():
                    raise
                if attempt == 7:
                    raise Conflict() from None
                time.sleep(0.025 * (attempt + 1))
    return run


def subject(actor, public_id, management=False, owner=False):
    if management and not admin_branches(actor).exists():
        raise PermissionDenied("Administrator assignment required.")
    query = scope_people(Caregiver.objects.all(), actor).filter(active=True)
    person = get_object_or_404(query.select_for_update().select_related("branch"), public_id=public_id)
    if management and not admin_branches(actor).filter(pk=person.branch_id).exists():
        from rest_framework.exceptions import NotFound
        raise NotFound()
    if owner and person.user_id != actor.pk:
        raise PermissionDenied("Only the caregiver owner may upload fixtures.")
    return person


def audit(actor, action, resource, branch, resource_type, metadata=None):
    AuditEvent.objects.create(actor=actor, action=action, resource_type=resource_type, resource_id=resource.public_id, branch=branch, occurred_at=timezone.now(), safe_metadata=metadata or {})
