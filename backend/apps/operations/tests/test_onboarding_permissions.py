import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.accounts.test_foundation import browser, UserFactory
from apps.operations.models import Agency, StateBranch, AgencyAdmin, BranchStaff, Client, DocumentVersion, StoredFile
from apps.operations.services.documents import upload_document, MAX_BYTES
from apps.operations.tests.test_onboarding import fixture

pytestmark = pytest.mark.django_db


def matrix(graph):
    client_only, wrong_state, alien_admin, django_admin = UserFactory.create_batch(4)
    Client.objects.create(branch=graph["branches"][0], user=client_only, name="Synthetic client only")
    BranchStaff.objects.create(branch=graph["branches"][1], user=wrong_state, role="administrator")
    alien = Agency.objects.create(name="Other synthetic agency")
    StateBranch.objects.create(agency=alien, state_code="FL", display_name="Other demo Florida", timezone="UTC")
    AgencyAdmin.objects.create(agency=alien, user=alien_admin)
    django_admin.is_staff = django_admin.is_superuser = True; django_admin.save()
    return [None, graph["other"], client_only, graph["staff"], wrong_state, alien_admin, django_admin]


def test_every_private_read_and_guessed_uuid_is_scoped(onboarding):
    graph = onboarding
    version = upload_document(graph["owner"], graph["caregiver"].public_id, fixture())
    paths = [f"applications/{graph['application'].public_id}/", f"applications/{graph['application'].public_id}/packet/", f"caregivers/{graph['caregiver'].public_id}/onboarding/", f"caregivers/{graph['caregiver'].public_id}/documents/", f"documents/{version.document.public_id}/", f"document-versions/{version.public_id}/download/"]
    for user in matrix(graph):
        client = browser(user)
        for path in paths:
            assert client.get("/api/v1/" + path).status_code == (403 if user is None else 404)
        queue = client.get("/api/v1/staff/onboarding/")
        if user and (AgencyAdmin.objects.filter(user=user).exists() or BranchStaff.objects.filter(user=user, role="administrator").exists()):
            assert queue.status_code == 200
            assert all(row["caregiver"] != str(graph["caregiver"].public_id) for row in queue.data["results"])
            assert queue.data["counts"]["total"] == 0
        else:
            assert queue.status_code == 403
    for key in ("owner", "state", "admin"):
        client = browser(graph[key])
        for path in paths:
            response = client.get("/api/v1/" + path)
            assert response.status_code == 200
            if getattr(response, "streaming", False):
                response.close()


def test_management_permissions_csrf_and_forged_fields(onboarding):
    graph = onboarding
    version = upload_document(graph["owner"], graph["caregiver"].public_id, fixture())
    paths = [(f"applications/{graph['application'].public_id}/transitions/", {"expected_status": "submitted", "new_status": "under_review"}), (f"document-versions/{version.public_id}/reviews/", {"expected_status": "pending", "decision": "approved"}), (f"caregivers/{graph['caregiver'].public_id}/onboarding/complete/", {"expected_status": "onboarding"})]
    for user in [graph["owner"], *matrix(graph)]:
        client = browser(user)
        for path, body in paths:
            response = client.post("/api/v1/" + path, body, format="json")
            assert response.status_code in (403, 404)
    for path, body in paths:
        admin = browser(graph["state"])
        for field in ("role", "owner_id", "branch_id", "user_id"):
            assert admin.post("/api/v1/" + path, {**body, field: "forged"}, format="json").status_code == 400
        admin.credentials()
        assert admin.post("/api/v1/" + path, body, format="json").status_code == 403
    upload_path = f"/api/v1/caregivers/{graph['caregiver'].public_id}/documents/"
    assert browser(graph["admin"]).post(upload_path, fixture(), format="multipart").status_code == 403
    client = browser(graph["owner"])
    for field in ("role", "owner_id", "branch_id", "user_id"):
        assert client.post(upload_path, {**fixture(), field: "forged"}, format="multipart").status_code == 400
    client.credentials()
    assert client.post(upload_path, fixture(), format="multipart").status_code == 403


@pytest.mark.parametrize("mutation,expected", [("category", 400), ("type", 415), ("signature", 415), ("digest", 400), ("empty", 400), ("oversize", 413), ("limit", 400), ("ack", 400), ("dates", 400)])
def test_rejects_arbitrary_and_malformed_uploads_without_writes(onboarding, mutation, expected):
    graph = onboarding
    data = fixture()
    if mutation == "category": data["fixture_id"] = "drivers_license-pdf"
    if mutation == "type": data["file"].content_type = "image/jpeg"
    if mutation == "signature": data["file"] = SimpleUploadedFile("cpr.pdf", b"invalid", content_type="application/pdf")
    if mutation == "digest": data["file"] = SimpleUploadedFile("cpr.pdf", b"%PDF- arbitrary data", content_type="application/pdf")
    if mutation == "empty": data["file"] = SimpleUploadedFile("cpr.pdf", b"", content_type="application/pdf")
    if mutation in {"oversize", "limit"}: data["file"] = SimpleUploadedFile("cpr.pdf", b"%PDF-" + b" " * (MAX_BYTES - 5 + (mutation == "oversize")), content_type="application/pdf")
    if mutation == "ack": data["demo_acknowledged"] = False
    if mutation == "dates": data["issued_on"] = "2099-01-01"
    before = StoredFile.objects.count()
    response = browser(graph["owner"]).post(f"/api/v1/caregivers/{graph['caregiver'].public_id}/documents/", data, format="multipart")
    assert response.status_code == expected
    assert DocumentVersion.objects.count() == 0 and StoredFile.objects.count() == before


def test_inactive_branch_and_assignment_hide_data(onboarding):
    graph = onboarding
    url = f"/api/v1/caregivers/{graph['caregiver'].public_id}/onboarding/"
    BranchStaff.objects.filter(user=graph["state"]).update(active=False)
    assert browser(graph["state"]).get(url).status_code == 404
    StateBranch.objects.filter(pk=graph["branches"][0].pk).update(active=False)
    for key in ("owner", "admin"):
        assert browser(graph[key]).get(url).status_code == 404
