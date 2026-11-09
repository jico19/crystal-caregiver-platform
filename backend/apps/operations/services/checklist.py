from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from apps.accounts.access import admin_branches
from ..models import BranchDocumentRequirement, BranchOnboardingPolicy, Document, CaregiverApplication, CaregiverOnboardingEvent
from .common import subject, audit, Conflict, retry_locked


def onboarding_snapshot(caregiver, actor):
    policy = BranchOnboardingPolicy.objects.filter(branch=caregiver.branch).first()
    today = timezone.localdate()
    end = today + timedelta(days=policy.expiry_lead_days if policy else 30)
    documents = {d.document_type_id: d for d in Document.objects.filter(caregiver=caregiver).prefetch_related("documentversion_set")}
    rows = []
    counts = dict.fromkeys(["total", "completed", "missing", "pending", "rejected", "expired", "expiring"], 0)
    for requirement in BranchDocumentRequirement.objects.filter(branch=caregiver.branch, active=True, document_type__active=True, document_type__audience="caregiver").select_related("document_type").order_by("document_type__code"):
        document = documents.get(requirement.document_type_id)
        versions = sorted(document.documentversion_set.all(), key=lambda v: v.version_number) if document else []
        latest = versions[-1] if versions else None
        approved = [v for v in versions if v.review_status == "approved"]
        effective = approved[-1] if approved else None
        state = latest.review_status if latest else "missing"
        if effective:
            if requirement.tracks_expiration and (not effective.expires_on or effective.expires_on < today):
                state = "expired"
            elif requirement.tracks_expiration and effective.expires_on <= end:
                state = "expiring"
            else:
                state = "valid"
        if requirement.required:
            counts["total"] += 1
            if state in {"valid", "expiring"}:
                counts["completed"] += 1
                if state == "expiring":
                    counts["expiring"] += 1
            else:
                counts[state] += 1
        rows.append({"document_type": requirement.document_type.code, "label": requirement.document_type.label, "required": requirement.required, "tracks_expiration": requirement.tracks_expiration, "latest_version": {"public_id": str(latest.public_id), "version_number": latest.version_number, "review_status": latest.review_status} if latest else None, "effective_version": str(effective.public_id) if effective else None, "state": state, "expires_on": effective.expires_on if effective else None})
    approved = CaregiverApplication.objects.filter(caregiver=caregiver, branch=caregiver.branch, status="approved").exists()
    ready = approved and counts["completed"] == counts["total"]
    manager = admin_branches(actor).filter(pk=caregiver.branch_id).exists()
    history = [{"public_id": str(event.public_id), "previous_status": event.previous_status, "new_status": event.new_status, "occurred_at": event.occurred_at, "evidence": event.evidence} for event in caregiver.caregiveronboardingevent_set.order_by("occurred_at", "public_id")]
    return {"caregiver": str(caregiver.public_id), "name": caregiver.name, "state_code": caregiver.branch.state_code, "status": caregiver.onboarding_status, "ready_to_complete": ready, "application_approved": approved, "requirements": rows, "counts": counts, "history": history, "allowed_actions": {"upload": caregiver.user_id == actor.pk, "complete": manager and ready and caregiver.onboarding_status == "onboarding", "review": manager}}


@retry_locked
@transaction.atomic
def complete_onboarding(actor, caregiver_id, data):
    caregiver = subject(actor, caregiver_id, management=True)
    snapshot = onboarding_snapshot(caregiver, actor)
    if caregiver.onboarding_status != data["expected_status"] or not snapshot["ready_to_complete"]:
        raise Conflict("Application approval and all required valid document approvals are needed; refresh the checklist.")
    evidence = {"applications": [str(value) for value in CaregiverApplication.objects.filter(caregiver=caregiver, branch=caregiver.branch, status="approved").values_list("public_id", flat=True)], "document_versions": [row["effective_version"] for row in snapshot["requirements"] if row["required"]]}
    caregiver.onboarding_status = "eligible"
    caregiver.save(update_fields=["onboarding_status", "updated_at"])
    event = CaregiverOnboardingEvent.objects.create(branch=caregiver.branch, caregiver=caregiver, reviewer=actor, previous_status="onboarding", new_status="eligible", evidence=evidence)
    audit(actor, "onboarding.completed", event, caregiver.branch, "onboarding", evidence)
    return onboarding_snapshot(caregiver, actor)
