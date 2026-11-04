"""Operational reports built from the same saved records used by the portals."""
from collections import Counter, defaultdict
from datetime import date, timedelta

from django.utils import timezone

from apps.authorizations.models import Authorization
from apps.caregivers.models import Caregiver
from apps.caregivers.services import caregiver_credential_status
from apps.clients.models import ClientReferral
from apps.compliance.models import AuditLog
from apps.documents.models import Document, DocumentRequirement
from apps.training.models import TrainingEnrollment


def build_operational_reports(states):
    states = list(states)
    state_ids = [state.pk for state in states]
    today = date.today()
    cutoff = today + timedelta(days=30)
    caregivers = list(Caregiver.objects.filter(
        state_id__in=state_ids, deleted_at__isnull=True, id__deleted_at__isnull=True,
    ).select_related("id", "state"))
    caregivers_by_id = {caregiver.pk: caregiver for caregiver in caregivers}
    documents_by_owner = defaultdict(list)
    for document in Document.objects.filter(
        state_id__in=state_ids, owner_id__in=caregivers_by_id, deleted_at__isnull=True,
    ).select_related("document_type"):
        documents_by_owner[document.owner_id].append(document)
    requirements_by_state = defaultdict(list)
    for requirement in DocumentRequirement.objects.filter(
        state_id__in=state_ids, required=True, for_role__in=["caregiver", "both"],
    ).select_related("document_type"):
        requirements_by_state[requirement.state_id].append(requirement)

    compliance_rows = []
    credential_rows = []
    for caregiver in caregivers:
        documents = [doc for doc in documents_by_owner[caregiver.pk] if doc.state_id == caregiver.state_id]
        credential_status = caregiver_credential_status(
            caregiver, documents=documents, requirements=requirements_by_state[caregiver.state_id],
        )
        name = f"{caregiver.first_name} {caregiver.last_name}"
        compliance_rows.append({
            "caregiver_id": str(caregiver.pk), "name": name,
            "email": caregiver.id.email, "state_code": caregiver.state.code,
            "missing": len(credential_status["missing_requirements"]),
            "missing_names": credential_status["missing_requirements"],
            "expired": len(credential_status["expired"]),
            "expiring_soon": len(credential_status["expiring_soon"]),
            "valid": len(credential_status["approved"]) + len(credential_status["expiring_soon"]),
            "compliant": credential_status["compliant"],
        })
        # Superseded expired copies do not make a renewed credential an issue.
        expired_names = set(credential_status["expired"])
        expiring_names = set(credential_status["expiring_soon"])
        for document in documents:
            document_name = document.document_type.name
            expiry = document.expiration_date
            if not expiry or expiry > cutoff or document.status not in ("approved", "expired"):
                continue
            if expiry < today and document_name not in expired_names:
                continue
            if expiry >= today and document_name not in expiring_names:
                continue
            credential_rows.append({
                "document_id": str(document.pk), "caregiver_id": str(caregiver.pk),
                "caregiver_name": name, "document_name": document_name,
                "state_code": caregiver.state.code, "expiration_date": expiry.isoformat(),
                "days_remaining": (expiry - today).days,
                "status": "expired" if expiry < today else "expiring_soon",
            })
    credential_rows.sort(key=lambda row: (row["expiration_date"], row["caregiver_name"]))

    training_groups = {}
    for enrollment in TrainingEnrollment.objects.filter(
        caregiver_id__in=caregivers_by_id,
    ).select_related("course", "caregiver__state"):
        key = (enrollment.course_id, enrollment.caregiver.state_id)
        row = training_groups.setdefault(key, {
            "course_id": enrollment.course_id, "state_code": enrollment.caregiver.state.code,
            "name": enrollment.course.name, "enrolled": 0, "completed": 0,
        })
        row["enrolled"] += 1
        row["completed"] += enrollment.status == "completed"
    training_rows = sorted(training_groups.values(), key=lambda row: (row["name"], row["state_code"]))
    for row in training_rows:
        row["completion_pct"] = round(row["completed"] * 100 / row["enrolled"], 1)

    authorization_rows = []
    for authorization in Authorization.objects.filter(
        state_id__in=state_ids, deleted_at__isnull=True, client__deleted_at__isnull=True,
    ).select_related("client", "state"):
        effective_status = authorization.status
        if effective_status in ("active", "expiring_soon"):
            if authorization.end_date < today:
                effective_status = "expired"
            elif authorization.end_date <= cutoff:
                effective_status = "expiring_soon"
        authorization_rows.append({
            "id": str(authorization.pk), "authorization_number": authorization.authorization_number,
            "client_name": f"{authorization.client.first_name} {authorization.client.last_name}",
            "state_code": authorization.state.code, "start_date": authorization.start_date.isoformat(),
            "end_date": authorization.end_date.isoformat(), "status": effective_status,
            "days_left": (authorization.end_date - today).days,
        })

    referrals = list(ClientReferral.objects.filter(
        state_id__in=state_ids, deleted_at__isnull=True,
    ).select_related("state").order_by("-created_at"))
    sources = {}
    for referral in referrals:
        source = referral.referral_source or "Unknown"
        row = sources.setdefault(source, {"source": source, "count": 0, "states": set()})
        row["count"] += 1
        row["states"].add(referral.state.code)
    source_rows = [dict(row, states=sorted(row["states"])) for row in sources.values()]
    source_rows.sort(key=lambda row: (-row["count"], row["source"]))

    # New public submissions have explicit audit provenance. Legacy records can
    # only be identified when their recorded source is Website.
    website_record_ids = set(AuditLog.objects.filter(
        entity_state_id__in=state_ids, action="CREATE_WEBSITE_INQUIRY", table_name="client_referrals",
    ).values_list("record_id", flat=True))
    inquiries = [referral for referral in referrals if (
        (referral.referral_source or "").strip().lower() == "website"
        or str(referral.pk) in website_record_ids
    )]
    inquiry_counts = Counter(referral.state.code for referral in inquiries)
    inquiry_rows = [{
        "id": str(referral.pk), "first_name": referral.first_name, "last_name": referral.last_name,
        "state_code": referral.state.code, "phone": referral.phone, "email": referral.email,
        "created_at": referral.created_at.isoformat(), "status": referral.status,
    } for referral in inquiries[:50]]

    return {
        "generated_at": timezone.now().isoformat(),
        "state_codes": [state.code for state in states],
        "caregiver_compliance": {
            "rows": compliance_rows, "total": len(compliance_rows),
            "compliant": sum(row["compliant"] for row in compliance_rows),
        },
        "expiring_credentials": {"rows": credential_rows, "total": len(credential_rows)},
        "training_completion": {
            "rows": training_rows, "total_courses": len({row["course_id"] for row in training_rows}),
        },
        "client_authorizations": {
            "rows": authorization_rows, "summary": dict(Counter(row["status"] for row in authorization_rows)),
        },
        "referral_sources": {"rows": source_rows, "total": len(referrals)},
        "website_inquiries": {
            "recent": inquiry_rows, "total": len(inquiries),
            "by_state": [{"code": state.code, "count": inquiry_counts[state.code]} for state in states],
        },
    }
