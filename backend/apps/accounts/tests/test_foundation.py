import hashlib
import io
import re
import uuid
from datetime import timedelta
from unittest.mock import patch
import factory
import pytest
from django.core import mail
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.test import APIClient
from apps.operations.models import (
    Agency,
    StateBranch,
    AgencyAdmin,
    BranchStaff,
    Caregiver,
    Client,
    FormTemplate,
    FormVersion,
    JobPosting,
    CaregiverApplication,
    JobSubmission,
    AuditEvent,
)
# Keep synthetic account fixtures inside the owning app's test package.
from ..models import User, Invitation

pytestmark = pytest.mark.django_db
PASSWORD = "Synthetic-only-Long-Passphrase!42"


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"test-{n}")
    email = factory.Sequence(lambda n: f"test-{n}@demo.example")
    password = factory.PostGenerationMethodCall("set_password", PASSWORD)


@pytest.fixture(autouse=True)
def config(settings, tmp_path):
    settings.PRIVATE_FILE_ROOT = tmp_path / "private"
    from django.core.cache import cache

    cache.clear()
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
    settings.DEBUG = True
    settings.REST_FRAMEWORK = {
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {
            "anon": "10000/hour",
            "user": "10000/hour",
            "auth": "10000/hour",
        },
    }
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"


@pytest.fixture
def graph():
    agency = Agency.objects.create(name="Synthetic Foundation Agency")
    branches = [
        StateBranch.objects.create(
            agency=agency, state_code=state, display_name=state, timezone="America/New_York"
        )
        for state in ("FL", "IN", "GA")
    ]
    owner, other, admin, state, staff = UserFactory.create_batch(5)
    AgencyAdmin.objects.create(agency=agency, user=admin)
    BranchStaff.objects.create(branch=branches[0], user=state, role="administrator")
    BranchStaff.objects.create(branch=branches[0], user=staff, role="staff")
    caregivers, clients = [], []
    for branch in branches:
        for user in (owner, other):
            caregivers.append(
                Caregiver.objects.create(
                    branch=branch, user=user, name=f"Synthetic caregiver {user.pk}"
                )
            )
            clients.append(
                Client.objects.create(branch=branch, user=user, name=f"Synthetic client {user.pk}")
            )
    template = FormTemplate.objects.create(
        branch=branches[0], audience="caregiver", kind="job", title="Demo"
    )
    version = FormVersion.objects.create(
        branch=branches[0], template=template, version_number=1, published_at=timezone.now()
    )
    job = JobPosting.objects.create(
        branch=branches[0],
        title="Synthetic job",
        description="Demo only",
        form_version=version,
        published=True,
    )
    return dict(
        agency=agency,
        branches=branches,
        owner=owner,
        other=other,
        admin=admin,
        state=state,
        staff=staff,
        caregivers=caregivers,
        clients=clients,
        job=job,
    )


def browser(user=None):
    client = APIClient(enforce_csrf_checks=True)
    csrf(client)
    if user:
        response = client.post(
            "/api/v1/auth/login/",
            {"email": user.email.upper(), "password": PASSWORD},
            format="json",
        )
        assert response.status_code == 200, response.data
        client.credentials(HTTP_X_CSRFTOKEN=response.data["csrfToken"])
    return client


def csrf(client):
    response = client.get("/api/v1/auth/csrf/")
    client.credentials(HTTP_X_CSRFTOKEN=response.data["csrfToken"])


def application_data():
    return {
        "name": "Synthetic Applicant",
        "email": f"applicant-{uuid.uuid4().hex}@demo.example",
        "password": PASSWORD,
        "demo_acknowledged": True,
    }


def test_anonymous_csrf_and_private_denial(graph):
    client = APIClient(enforce_csrf_checks=True)
    for path in ("caregivers/", "clients/", "applications/", "auth/me/"):
        assert client.get("/api/v1/" + path).status_code == 403
    assert (
        client.post(
            "/api/v1/auth/login/", {"email": graph["owner"].email, "password": PASSWORD}
        ).status_code
        == 403
    )
    assert (
        client.post(f"/api/v1/jobs/{graph['job'].public_id}/apply/", application_data()).status_code
        == 403
    )
    signed = browser(graph["owner"])
    signed.credentials()
    assert signed.post("/api/v1/auth/logout/").status_code == 403
    csrf(signed)
    assert signed.post("/api/v1/auth/logout/").status_code == 204
    assert signed.get("/api/v1/auth/me/").status_code == 403


@pytest.mark.parametrize("endpoint,key", [("caregivers", "caregivers"), ("clients", "clients")])
def test_ownership_and_branch_boundaries(graph, endpoint, key):
    owner = browser(graph["owner"])
    records = owner.get(f"/api/v1/{endpoint}/").data["results"]
    assert len(records) == 3
    assert owner.get(f"/api/v1/{endpoint}/{graph[key][1].public_id}/").status_code == 404
    state = browser(graph["state"])
    assert len(state.get(f"/api/v1/{endpoint}/").data["results"]) == 2
    assert state.get(f"/api/v1/{endpoint}/?branch__state_code=IN").data["count"] == 0
    assert state.get(f"/api/v1/{endpoint}/{graph[key][2].public_id}/").status_code == 404
    assert browser(graph["admin"]).get(f"/api/v1/{endpoint}/").data["count"] == 6
    assert browser(graph["staff"]).get(f"/api/v1/{endpoint}/").data["count"] == 0
    assert (
        owner.patch(
            f"/api/v1/{endpoint}/{graph[key][0].public_id}/", {"active": False}, format="json"
        ).status_code
        == 405
    )


def test_admin_does_not_cross_agencies(graph):
    agency = Agency.objects.create(name="Other synthetic agency")
    branch = StateBranch.objects.create(
        agency=agency, state_code="FL", display_name="Other FL", timezone="UTC"
    )
    record = Caregiver.objects.create(branch=branch, name="Other agency")
    client = browser(graph["admin"])
    assert client.get(f"/api/v1/caregivers/{record.public_id}/").status_code == 404


def test_inactive_assignments_and_django_flags_do_not_grant_access(graph):
    client = browser(graph["state"])
    BranchStaff.objects.filter(user=graph["state"]).update(active=False)
    assert client.get("/api/v1/caregivers/").data["count"] == 0
    user = UserFactory(is_staff=True, is_superuser=True)
    assert browser(user).get("/api/v1/caregivers/").data["count"] == 0
    user.is_active = False
    user.save()
    assert APIClient().login(username=user.email, password=PASSWORD) is False


def test_application_creates_account_profile_status_and_audit(graph):
    client = browser()
    url = f"/api/v1/jobs/{graph['job'].public_id}/apply/"
    data = application_data()
    response = client.post(url, data, format="json")
    assert response.status_code == 201, response.data
    client.credentials(HTTP_X_CSRFTOKEN=response.data["csrfToken"])
    user = User.objects.get(email=data["email"])
    assert user.check_password(PASSWORD) and not user.is_staff
    assert client.get("/api/v1/auth/me/").data["roles"] == ["caregiver"]
    assert client.get("/api/v1/applications/").data["results"][0]["status"] == "submitted"
    assert AuditEvent.objects.filter(action="application.submitted", actor=user).exists()
    assert (
        browser(graph["other"])
        .get(f"/api/v1/applications/{response.data['application']}/")
        .status_code
        == 404
    )
    assert (
        client.post(
            url, {k: v for k, v in data.items() if k != "password"}, format="json"
        ).status_code
        == 400
    )
    assert JobSubmission.objects.count() == 1


@pytest.mark.parametrize("forged", ["role", "owner_id", "branch_id", "agency"])
def test_application_rejects_forged_fields(graph, forged):
    data = {**application_data(), forged: str(graph["branches"][1].public_id)}
    assert (
        browser()
        .post(f"/api/v1/jobs/{graph['job'].public_id}/apply/", data, format="json")
        .status_code
        == 400
    )
    assert CaregiverApplication.objects.count() == 0


def test_existing_email_is_not_claimed_and_failed_application_rolls_back(graph):
    data = {**application_data(), "email": graph["owner"].email}
    url = f"/api/v1/jobs/{graph['job'].public_id}/apply/"
    assert browser().post(url, data, format="json").status_code == 400
    data = application_data()
    with patch(
        "apps.operations.services.applications.JobSubmission.objects.create",
        side_effect=RuntimeError("rollback"),
    ):
        with pytest.raises(RuntimeError):
            browser().post(url, data, format="json")
    assert not User.objects.filter(email=data["email"]).exists()
    assert CaregiverApplication.objects.count() == 0


def test_invitations_scope_expiry_reuse_and_existing_user(
    graph, django_capture_on_commit_callbacks
):
    state = browser(graph["state"])
    base = {
        "email": "invited@demo.example",
        "branch": str(graph["branches"][0].public_id),
        "role": "client",
    }
    assert (
        state.post(
            "/api/v1/auth/invitations/", {**base, "role": "administrator"}, format="json"
        ).status_code
        == 403
    )
    assert (
        state.post(
            "/api/v1/auth/invitations/",
            {**base, "branch": str(graph["branches"][1].public_id)},
            format="json",
        ).status_code
        == 403
    )
    with django_capture_on_commit_callbacks(execute=True):
        response = state.post("/api/v1/auth/invitations/", base, format="json")
    assert response.status_code == 201
    assert "token" not in response.data
    token = re.search(r"token=([\w-]+)", mail.outbox[-1].body).group(1)
    payload = {"token": token, "name": "Synthetic invited client", "password": PASSWORD}
    assert (
        browser().post("/api/v1/auth/invitations/accept/", payload, format="json").status_code
        == 200
    )
    assert (
        browser().post("/api/v1/auth/invitations/accept/", payload, format="json").status_code
        == 400
    )
    invitation = Invitation.objects.create(
        email=graph["owner"].email,
        branch=graph["branches"][0],
        role="client",
        token_hash=hashlib.sha256(b"existing").hexdigest(),
        created_by=graph["state"],
        expires_at=timezone.now() + timedelta(hours=1),
    )
    payload["token"] = "existing"
    assert (
        browser().post("/api/v1/auth/invitations/accept/", payload, format="json").status_code
        == 400
    )
    assert (
        browser(graph["owner"])
        .post("/api/v1/auth/invitations/accept/", payload, format="json")
        .status_code
        == 200
    )
    invitation = Invitation.objects.create(
        email="expired@demo.example",
        branch=graph["branches"][0],
        role="client",
        token_hash=hashlib.sha256(b"expired").hexdigest(),
        created_by=graph["state"],
        expires_at=timezone.now() - timedelta(seconds=1),
    )
    payload["token"] = "expired"
    assert (
        browser().post("/api/v1/auth/invitations/accept/", payload, format="json").status_code
        == 400
    )


def test_reset_is_generic_and_token_is_single_use(graph):
    client = browser()
    known = client.post(
        "/api/v1/auth/password-reset/", {"email": graph["owner"].email}, format="json"
    )
    unknown = client.post(
        "/api/v1/auth/password-reset/", {"email": "absent@demo.example"}, format="json"
    )
    assert known.data == unknown.data
    match = re.search(r"uid=([\w-]+)&token=([\w-]+)", mail.outbox[-1].body)
    data = {"uid": match.group(1), "token": match.group(2), "password": PASSWORD + "-new"}
    assert (
        client.post("/api/v1/auth/password-reset/confirm/", data, format="json").status_code == 200
    )
    assert (
        client.post("/api/v1/auth/password-reset/confirm/", data, format="json").status_code == 400
    )


def test_seeds_are_repeatable_and_preserve_passwords():
    output = io.StringIO()
    call_command("seed_demo", stdout=output)
    passwords = list(User.objects.order_by("pk").values_list("password", flat=True))
    output = io.StringIO()
    call_command("seed_demo", stdout=output)
    assert list(User.objects.order_by("pk").values_list("password", flat=True)) == passwords
    assert "Password:" not in output.getvalue()
    assert StateBranch.objects.count() == 3 and JobPosting.objects.count() == 6


def test_case_insensitive_email_constraint(graph):
    with pytest.raises(IntegrityError), transaction.atomic():
        UserFactory(email=graph["owner"].email.upper())
