from datetime import timedelta
from unittest.mock import patch
import pytest
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.exceptions import APIException
# Keep shared sign-in helpers inside the account test package.
from apps.accounts.tests.test_foundation import browser
from apps.operations.models import ApplicationReview, AuditEvent, CaregiverOnboardingEvent, BranchDocumentRequirement, BranchOnboardingPolicy, DocumentVersion, DocumentReview, StoredFile
from apps.operations.private_files import FIXTURES, private_root
from apps.operations.services.transitions import transition_application
from apps.operations.services.documents import upload_document, review_document, MAX_BYTES
from apps.operations.services.checklist import onboarding_snapshot, complete_onboarding

pytestmark = pytest.mark.django_db


# Build exact bundled upload bytes with optional expiry metadata for lifecycle tests.
def fixture(category="cpr", extension="pdf", expiry=True):
    media = {"pdf": "application/pdf", "png": "image/png", "jpg": "image/jpeg"}[extension]
    name = f"{category}.{extension}"
    data = {"document_type": category, "fixture_id": f"{category}-{extension}", "demo_acknowledged": True, "file": SimpleUploadedFile(name, (FIXTURES / name).read_bytes(), content_type=media)}
    if expiry:
        data["expires_on"] = timezone.localdate() + timedelta(days=90)
    return data


# Exercise submitted-to-approved transitions to establish onboarding prerequisites.
def approve_application(graph):
    for previous, target in [("submitted", "under_review"), ("under_review", "approved")]:
        transition_application(graph["state"], graph["application"].public_id, {"expected_status": previous, "new_status": target, "comment": ""})


# Check expected-status conflicts, rejection reasons and failed-audit rollback.
def test_review_transitions_staleness_and_atomic_rollback(onboarding):
    graph = onboarding
    app = graph["application"]
    assert ApplicationReview.objects.filter(application=app).count() == 1
    client = browser(graph["state"])
    url = f"/api/v1/applications/{app.public_id}/transitions/"
    data = {"expected_status": "submitted", "new_status": "under_review"}
    assert client.post(url, data, format="json").status_code == 200
    assert client.post(url, data, format="json").status_code == 409
    assert client.post(url, {"expected_status": "under_review", "new_status": "rejected", "comment": " "}, format="json").status_code == 400
    with patch("apps.operations.services.transitions.audit", side_effect=RuntimeError("Synthetic audit failure")):
        with pytest.raises(RuntimeError):
            transition_application(graph["state"], app.public_id, {"expected_status": "under_review", "new_status": "approved", "comment": ""})
    app.refresh_from_db()
    assert app.status == "under_review"
    assert not CaregiverOnboardingEvent.objects.exists()
    assert ApplicationReview.objects.filter(application=app).count() == 2


# Require approvals, preserve demo completion evidence and reject duplicate completion.
def test_full_lifecycle_completion_and_historical_evidence(onboarding):
    graph = onboarding
    caregiver = graph["caregiver"]
    with pytest.raises(APIException):
        complete_onboarding(graph["state"], caregiver.public_id, {"expected_status": "onboarding"})
    approve_application(graph)
    for category in ("drivers_license", "cpr", "cna_hha"):
        version = upload_document(graph["owner"], caregiver.public_id, fixture(category))
        review_document(graph["state"], version.public_id, {"expected_status": "pending", "decision": "approved", "comment": ""})
    result = complete_onboarding(graph["state"], caregiver.public_id, {"expected_status": "onboarding"})
    assert result["status"] == "eligible" and result["counts"]["completed"] == 3
    assert len(result["history"][-1]["evidence"]["document_versions"]) == 3
    with pytest.raises(APIException):
        complete_onboarding(graph["state"], caregiver.public_id, {"expected_status": "onboarding"})
    caregiver.refresh_from_db()
    with patch("apps.operations.services.checklist.timezone.localdate", return_value=timezone.localdate() + timedelta(days=100)):
        snapshot = onboarding_snapshot(caregiver, graph["owner"])
    assert snapshot["status"] == "eligible" and not snapshot["ready_to_complete"]
    assert snapshot["counts"]["expired"] == 3 and len(snapshot["history"]) == 2
    with pytest.raises(IntegrityError), transaction.atomic():
        CaregiverOnboardingEvent.objects.filter(caregiver=caregiver).update(evidence={})


# Check expiry boundaries while retaining effective approval during pending replacement.
@pytest.mark.parametrize("offset,state", [(-1, "expired"), (0, "expiring"), (30, "expiring"), (31, "valid")])
def test_expiry_boundaries_and_replacement_effective_version(onboarding, offset, state):
    graph = onboarding
    data = fixture()
    data["expires_on"] = timezone.localdate() + timedelta(days=offset)
    version = upload_document(graph["owner"], graph["caregiver"].public_id, data)
    review_document(graph["state"], version.public_id, {"expected_status": "pending", "decision": "approved", "comment": ""})
    replacement = upload_document(graph["owner"], graph["caregiver"].public_id, fixture())
    for decision in (None, "rejected"):
        if decision:
            review_document(graph["state"], replacement.public_id, {"expected_status": "pending", "decision": decision, "comment": "Synthetic demo reason"})
        row = next(row for row in onboarding_snapshot(graph["caregiver"], graph["owner"])["requirements"] if row["document_type"] == "cpr")
        assert row["state"] == state and row["effective_version"] == str(version.public_id)
        assert row["latest_version"]["public_id"] == str(replacement.public_id)


# Remove failed-upload bytes and roll back decisions when audit persistence fails.
def test_file_rollback_and_decision_rollback(onboarding):
    graph = onboarding
    with patch("apps.operations.services.documents.audit", side_effect=RuntimeError("Synthetic audit failure")):
        with pytest.raises(RuntimeError):
            upload_document(graph["owner"], graph["caregiver"].public_id, fixture())
    assert DocumentVersion.objects.count() == 0
    # The application's packet remains referenced; failed uploads leave no bytes.
    assert len(list(private_root().iterdir())) == StoredFile.objects.count() == 1
    version = upload_document(graph["owner"], graph["caregiver"].public_id, fixture())
    with patch("apps.operations.services.documents.audit", side_effect=RuntimeError("Synthetic audit failure")):
        with pytest.raises(RuntimeError):
            review_document(graph["state"], version.public_id, {"expected_status": "pending", "decision": "approved", "comment": ""})
    version.refresh_from_db()
    assert version.review_status == "pending" and DocumentReview.objects.count() == 0


# Keep application approval required without document requirements and reject negative expiry windows.
def test_empty_requirements_and_config_edits(onboarding):
    graph = onboarding
    BranchDocumentRequirement.objects.update(required=False)
    value = onboarding_snapshot(graph["caregiver"], graph["owner"])
    assert value["counts"]["total"] == value["counts"]["completed"] == 0
    assert not value["ready_to_complete"]  # Application approval still required.
    with pytest.raises(IntegrityError), transaction.atomic():
        BranchOnboardingPolicy.objects.update(expiry_lead_days=-1)


# Use the newest approval even when expired and reject another terminal review.
def test_newest_approval_expiry_does_not_fall_back_and_review_is_terminal(onboarding):
    graph = onboarding
    first = upload_document(graph["owner"], graph["caregiver"].public_id, fixture())
    review_document(graph["state"], first.public_id, {"expected_status": "pending", "decision": "approved", "comment": ""})
    data = fixture(); data["expires_on"] = timezone.localdate() - timedelta(days=1)
    newest = upload_document(graph["owner"], graph["caregiver"].public_id, data)
    review_document(graph["state"], newest.public_id, {"expected_status": "pending", "decision": "approved", "comment": ""})
    with pytest.raises(APIException):
        review_document(graph["state"], newest.public_id, {"expected_status": "pending", "decision": "rejected", "comment": "Synthetic reason"})
    row = next(row for row in onboarding_snapshot(graph["caregiver"], graph["owner"])["requirements"] if row["document_type"] == "cpr")
    assert row["state"] == "expired" and row["effective_version"] == str(newest.public_id)


# Leave neither changed caregiver state nor milestone evidence after a failed completion audit.
def test_completion_audit_failure_rolls_back_milestone(onboarding):
    graph = onboarding
    approve_application(graph)
    BranchDocumentRequirement.objects.update(required=False)
    with patch("apps.operations.services.checklist.audit", side_effect=RuntimeError("Synthetic audit failure")):
        with pytest.raises(RuntimeError):
            complete_onboarding(graph["state"], graph["caregiver"].public_id, {"expected_status": "onboarding"})
    graph["caregiver"].refresh_from_db()
    assert graph["caregiver"].onboarding_status == "onboarding"
    assert not CaregiverOnboardingEvent.objects.filter(new_status="eligible").exists()


# Preserve published packets/schemas and operator-edited requirements across reseeding.
def test_seed_preserves_packet_published_schema_and_policy_edits(onboarding):
    from apps.operations.demo_onboarding import seed_requirements, seed_application_version
    graph = onboarding
    application = graph["application"]
    original = application.form_version
    policy = BranchOnboardingPolicy.objects.get(branch=application.branch)
    policy.expiry_lead_days = 7; policy.save()
    BranchDocumentRequirement.objects.filter(branch=application.branch, document_type__code="cpr").update(required=False)
    before = StoredFile.objects.count()
    assert seed_application_version(application.branch, original.template).public_id == original.public_id
    seed_requirements(application.branch)
    assert StoredFile.objects.count() == before
    assert BranchOnboardingPolicy.objects.get(pk=policy.pk).expiry_lead_days == 7
    assert not BranchDocumentRequirement.objects.get(branch=application.branch, document_type__code="cpr").required
    response = browser(graph["owner"]).get(f"/api/v1/applications/{application.public_id}/packet/")
    assert b"".join(response.streaming_content) == (FIXTURES / "packet-FL-v2.pdf").read_bytes()
    with pytest.raises(IntegrityError), transaction.atomic():
        type(original).objects.filter(pk=original.pk).update(field_schema={})


# Clean newly written packet bytes when a seed transaction fails.
def test_seed_failure_removes_new_packet_bytes(onboarding):
    import io
    from django.core.management import call_command
    from apps.operations.models import JobPosting
    before = set(private_root().iterdir())
    create = JobPosting.objects.get_or_create
    # Inject failure only after a new synthetic packet has been written.
    def fail_after_packet(*args, **kwargs):
        if kwargs.get("title", "").startswith("Extended"):
            assert len(set(private_root().iterdir()) - before) == 1
            raise RuntimeError("Synthetic seed failure")
        return create(*args, **kwargs)
    with patch("apps.accounts.management.commands.seed_demo.JobPosting.objects.get_or_create", side_effect=fail_after_packet):
        with pytest.raises(RuntimeError):
            call_command("seed_demo", stdout=io.StringIO())
    assert set(private_root().iterdir()) == before


# Verify configured category/format uploads and exact authorized fixture downloads with private headers.
@pytest.mark.parametrize("extension", ["pdf", "png", "jpg"])
def test_each_category_and_format_and_exact_download(onboarding, extension):
    graph = onboarding
    client = browser(graph["owner"])
    for category in BranchDocumentRequirement.objects.select_related("document_type"):
        data = fixture(category.document_type.code, extension, category.tracks_expiration)
        expected = data["file"].read(); data["file"].seek(0)
        response = client.post(f"/api/v1/caregivers/{graph['caregiver'].public_id}/documents/", data, format="multipart")
        assert response.status_code == 201
        download = client.get(f"/api/v1/document-versions/{response.data['public_id']}/download/")
        assert download.status_code == 200 and b"".join(download.streaming_content) == expected
        assert download["Cache-Control"] == "private, no-store"
        assert download["X-Content-Type-Options"] == "nosniff"
        assert "storage" not in str(response.data) and "sha256" not in str(response.data)
