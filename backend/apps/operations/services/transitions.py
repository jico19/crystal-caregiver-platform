from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from ..models import CaregiverApplication, ApplicationReview, CaregiverOnboardingEvent
from .common import subject, audit, Conflict, retry_locked


# Apply allowed expected-status transitions and related demo onboarding history atomically.
@retry_locked
@transaction.atomic
def transition_application(actor, public_id, data):
    # Resolve through a scoped application first; lock parent before child.
    from apps.accounts.access import admin_branches
    from rest_framework.exceptions import PermissionDenied
    if not admin_branches(actor).exists():
        raise PermissionDenied("Administrator assignment required.")
    application = get_object_or_404(CaregiverApplication.objects.filter(branch__in=admin_branches(actor), caregiver__active=True), public_id=public_id)
    caregiver = subject(actor, application.caregiver.public_id, management=True)
    application = CaregiverApplication.objects.select_for_update().get(pk=application.pk)
    transitions = {"submitted": {"under_review"}, "under_review": {"approved", "rejected"}}
    previous = application.status
    target = data["new_status"]
    if previous != data["expected_status"] or target not in transitions.get(previous, set()):
        raise Conflict()
    if target == "rejected" and not data.get("comment", "").strip():
        raise ValidationError({"comment": "A rejection reason is required."})
    application.status = target
    application.save(update_fields=["status", "updated_at"])
    ApplicationReview.objects.create(branch=application.branch, application=application, reviewer=actor, previous_status=previous, new_status=target, comment=data.get("comment", ""), reviewed_at=timezone.now())
    audit(actor, "application.transitioned", application, application.branch, "application", {"previous_status": previous, "new_status": target})
    if target == "approved" and caregiver.onboarding_status == "pending":
        caregiver.onboarding_status = "onboarding"
        caregiver.save(update_fields=["onboarding_status", "updated_at"])
        event = CaregiverOnboardingEvent.objects.create(branch=caregiver.branch, caregiver=caregiver, reviewer=actor, previous_status="pending", new_status="onboarding", evidence={"application": str(application.public_id)})
        audit(actor, "onboarding.started", event, caregiver.branch, "onboarding")
    return application
