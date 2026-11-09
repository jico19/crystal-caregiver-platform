import pytest
# Reuse synthetic account fixtures from their dedicated test package.
from apps.accounts.tests.test_foundation import graph, config, browser, UserFactory
from apps.operations.services.application_forms import EXTENDED_SCHEMA
from apps.operations.models import FormVersion, JobPosting, CaregiverApplication, AuditEvent
from django.utils import timezone

pytestmark = pytest.mark.django_db


# Publish a version-two opportunity for extended-answer validation tests.
@pytest.fixture
def extended(graph):
    old = graph["job"]
    version = FormVersion.objects.create(branch=old.branch, template=old.form_version.template, version_number=2, field_schema=EXTENDED_SCHEMA, published_at=timezone.now())
    return JobPosting.objects.create(branch=old.branch, form_version=version, title="Synthetic extended", description="Demo only", published=True)


# Build valid synthetic extended answers while exercising whitespace normalization.
def answers(user):
    return {"name": " Synthetic applicant ", "email": user.email, "demo_acknowledged": True, "experience": "none", "availability": ["weekdays", "daytime"]}


# Preserve submitted answers with their original published schema in application details.
def test_extended_answers_and_original_schema_detail(graph, extended):
    client = browser(graph["owner"])
    response = client.post(f"/api/v1/jobs/{extended.public_id}/apply/", answers(graph["owner"]), format="json")
    assert response.status_code == 201
    application = CaregiverApplication.objects.get(public_id=response.data["application"])
    assert application.submitted_answers["name"] == "Synthetic applicant"
    assert "password" not in application.submitted_answers
    detail = client.get(f"/api/v1/applications/{application.public_id}/").data
    assert detail["form"]["field_schema"] == EXTENDED_SCHEMA
    assert detail["submitted_answers"]["availability"] == ["weekdays", "daytime"]
    assert client.get(f"/api/v1/jobs/{extended.public_id}/").data["application_form"]["version_number"] == 2


# Reject invalid/forged extended answers without submission data or submission audit writes.
@pytest.mark.parametrize("field,value", [("experience", "invented"), ("availability", []), ("availability", ["weekends", "weekends"]), ("availability", ["unknown"]), ("branch_id", "forged"), ("role", "administrator"), ("name", " ")])
def test_invalid_answers_are_atomic(graph, extended, field, value):
    data = answers(graph["owner"])
    data[field] = value
    before = AuditEvent.objects.count()
    response = browser(graph["owner"]).post(f"/api/v1/jobs/{extended.public_id}/apply/", data, format="json")
    assert response.status_code == 400
    assert not CaregiverApplication.objects.exists()
    # Login may write its own audit; submission does not.
    assert not AuditEvent.objects.filter(action="application.submitted").exists()


# Retain legacy forms while checking detail ownership, administrator access and unavailable packets.
def test_legacy_and_permissions(graph):
    owner = browser(graph["owner"])
    data = {"name": "Synthetic", "email": graph["owner"].email, "demo_acknowledged": True}
    response = owner.post(f"/api/v1/jobs/{graph['job'].public_id}/apply/", data, format="json")
    assert response.status_code == 201
    url = f"/api/v1/applications/{response.data['application']}/"
    assert owner.get(url).status_code == 200
    assert browser().get(url).status_code == 403
    for key in ("other", "staff"):
        assert browser(graph[key]).get(url).status_code == 404
    assert browser(graph["admin"]).get(url).status_code == 200
    assert browser(graph["state"]).get(url).status_code == 200
    stranger = UserFactory()
    assert browser(stranger).get(url).status_code == 404
    assert owner.get(url + "packet/").status_code == 404


# Reject withdrawn jobs and roll back submissions whose audit fails.
def test_stale_job_and_submission_audit_failure_are_atomic(graph, extended):
    from unittest.mock import patch
    from apps.operations.services import apply_to_job
    from rest_framework.exceptions import ValidationError
    JobPosting.objects.filter(pk=extended.pk).update(published=False)
    with pytest.raises(ValidationError):
        apply_to_job(extended, answers(graph["owner"]), graph["owner"])
    JobPosting.objects.filter(pk=extended.pk).update(published=True)
    with patch("apps.operations.services.applications.audit", side_effect=RuntimeError("Synthetic audit failure")):
        with pytest.raises(RuntimeError):
            apply_to_job(extended, answers(graph["owner"]), graph["owner"])
    assert not CaregiverApplication.objects.exists()
