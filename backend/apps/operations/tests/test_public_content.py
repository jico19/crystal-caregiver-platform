import pytest
from rest_framework.test import APIClient
from apps.operations.demo_content import seed_branch_content
from apps.operations.models import Agency, StateBranch, BranchContent

pytestmark = pytest.mark.django_db


def test_only_published_active_state_content_is_public():
    agency = Agency.objects.create(name="Synthetic public content")
    for state in ("FL", "IN", "GA"):
        branch = StateBranch.objects.create(agency=agency, state_code=state, display_name=state, timezone="UTC")
        seed_branch_content(branch)
        BranchContent.objects.create(branch=branch, content_key="draft", title="Private draft", body="Hidden")
    client = APIClient()
    for state in ("FL", "IN", "GA"):
        response = client.get(f"/api/v1/branch-content/?branch__state_code={state}")
        assert response.status_code == 200
        assert response.data["count"] == 4
        assert {row["state_code"] for row in response.data["results"]} == {state}
        assert all("draft" != row["content_key"] for row in response.data["results"])
        assert client.post("/api/v1/branch-content/", {}).status_code in (403, 405)
    StateBranch.objects.filter(state_code="FL").update(active=False)
    assert client.get("/api/v1/branch-content/?branch__state_code=FL").data["count"] == 0


def test_seed_preserves_content_edits_and_publication():
    agency = Agency.objects.create(name="Synthetic seed")
    branch = StateBranch.objects.create(agency=agency, state_code="FL", display_name="Demo", timezone="UTC")
    seed_branch_content(branch)
    BranchContent.objects.filter(branch=branch, content_key="services").update(body="Operator edit", publication_status="draft")
    seed_branch_content(branch)
    assert BranchContent.objects.filter(branch=branch).count() == 4
    row = BranchContent.objects.get(branch=branch, content_key="services")
    assert row.body == "Operator edit" and row.publication_status == "draft"
