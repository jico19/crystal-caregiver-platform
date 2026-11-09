"""Exercise database integrity through direct writes, bypassing model validation."""

from datetime import timedelta
from itertools import count
import uuid

import pytest
from django.apps import apps
from django.db import IntegrityError, models, transaction
from django.utils import timezone

from .. import models as domain

pytestmark = pytest.mark.django_db
sequence = count(1)


@pytest.fixture
def branches():
    agency = domain.Agency.objects.create(name="Synthetic Agency")
    return [
        domain.StateBranch.objects.create(
            agency=agency,
            state_code=state,
            display_name=state,
            timezone="America/New_York",
        )
        for state in ("FL", "IN")
    ]


def sample(model, branch, **overrides):
    """Create valid minimal graph data without relying on production seeds."""
    n = next(sequence)
    data = {}
    for field in model._meta.fields:
        if field.primary_key or field.auto_created or field.name in {"created_at", "updated_at"}:
            continue
        if field.name in overrides:
            continue
        if field.name == "branch":
            data[field.name] = branch
        elif field.name == "caregiver" and model in {domain.Document, domain.SignatureRequest}:
            data[field.name] = sample(domain.Caregiver, branch)
        elif field.name == "recipient_user" and model == domain.Notification:
            data[field.name] = sample(apps.get_model("accounts", "User"), branch)
        elif field.null or field.has_default():
            continue
        elif field.is_relation:
            data[field.name] = sample(field.related_model, branch)
        elif isinstance(field, models.DateTimeField):
            data[field.name] = timezone.now() + (
                timedelta(hours=1) if field.name == "ends_at" else timedelta()
            )
        elif isinstance(field, models.DateField):
            data[field.name] = timezone.localdate()
        elif isinstance(field, models.UUIDField):
            data[field.name] = uuid.uuid4()
        elif isinstance(field, models.IntegerField):
            data[field.name] = 1
        elif field.choices:
            data[field.name] = field.choices[0][0]
        else:
            data[field.name] = f"synthetic-{n}"
    if model == domain.TrainingCertificate and "assignment" not in overrides:
        data["assignment"].completed_at = timezone.now()
        data["assignment"].progress_percent = 100
        data["assignment"].save()
    if model == domain.SignatureEvent and "signer" not in overrides:
        data["signer"] = data["request"].requested_signer
    if model == domain.AuthorizationDocument and "document_version" not in overrides:
        document = sample(
            domain.Document, branch, caregiver=None, client=data["authorization"].client
        )
        data["document_version"] = sample(domain.DocumentVersion, branch, document=document)
    if model == domain.JobSubmission and "application" not in overrides:
        data["application"] = sample(
            domain.CaregiverApplication, branch, caregiver=data["caregiver"]
        )
    data.update(overrides)
    return model.objects.create(**data)


def copy_values(record):
    return {
        f.attname: getattr(record, f.attname)
        for f in record._meta.fields
        if not f.primary_key and f.name not in {"public_id", "created_at", "updated_at"}
    }


SCOPED_LINKS = [
    (model, field)
    for model in apps.get_app_config("operations").get_models()
    if "branch" in {f.name for f in model._meta.fields}
    for field in model._meta.fields
    if field.is_relation
    and field.name != "branch"
    and "branch" in {f.name for f in field.related_model._meta.fields}
]


@pytest.mark.parametrize(
    "model,field", SCOPED_LINKS, ids=[f"{m.__name__}.{f.name}" for m, f in SCOPED_LINKS]
)
def test_cross_state_insert_is_rejected(branches, model, field):
    record = sample(model, branches[0])
    other = sample(field.related_model, branches[1])
    values = copy_values(record)
    values[field.attname] = other.pk
    # Regenerate unique business identifiers so the scope guard is exercised.
    for name in ("certificate_reference", "private_storage_key", "deduplication_key"):
        if name in values:
            values[name] = str(uuid.uuid4())
    with pytest.raises(IntegrityError, match="Agency record integrity|scope"), transaction.atomic():
        model.objects.create(**values)


def test_one_login_has_separate_state_records(branches, django_user_model):
    user = django_user_model.objects.create_user(username="synthetic")
    for branch in branches:
        sample(domain.Caregiver, branch, user=user)
    assert domain.Caregiver.objects.filter(user=user).count() == 2
    with pytest.raises(IntegrityError), transaction.atomic():
        sample(domain.Caregiver, branches[0], user=user)


def test_state_admin_cannot_hold_two_active_states(branches):
    first = sample(domain.BranchStaff, branches[0], role="administrator")
    with pytest.raises(IntegrityError), transaction.atomic():
        sample(domain.BranchStaff, branches[1], user=first.user, role="administrator")


@pytest.mark.parametrize(
    "model",
    [
        domain.ApplicationReview,
        domain.IntakeReview,
        domain.DocumentReview,
        domain.AuthorizationEvent,
        domain.SignatureEvent,
        domain.DeliveryAttempt,
        domain.AuditEvent,
        domain.FormVersion,
        domain.TrainingCourseVersion,
        domain.TrainingCertificate,
        domain.CarePlan,
    ],
)
def test_evidence_is_append_only(branches, model):
    record = sample(model, branches[0])
    with pytest.raises(IntegrityError), transaction.atomic():
        model.objects.filter(pk=record.pk).update(public_id=uuid.uuid4())
    with pytest.raises(IntegrityError), transaction.atomic():
        model.objects.filter(pk=record.pk)._raw_delete("default")


def test_submitted_answers_cannot_be_replaced(branches):
    application = sample(domain.CaregiverApplication, branches[0], submitted_at=timezone.now())
    with pytest.raises(IntegrityError), transaction.atomic():
        domain.CaregiverApplication.objects.filter(pk=application.pk).update(
            submitted_answers={"changed": True}
        )


def test_pending_replacement_preserves_approved_version(branches):
    approved = sample(domain.DocumentVersion, branches[0], review_status="approved")
    pending = sample(
        domain.DocumentVersion, branches[0], document=approved.document, version_number=2
    )
    approved.refresh_from_db()
    assert approved.review_status == "approved"
    assert pending.review_status == "pending"
    with pytest.raises(IntegrityError), transaction.atomic():
        domain.DocumentVersion.objects.filter(pk=approved.pk).update(file=pending.file)


def test_invalid_dates_and_progress_are_rejected(branches):
    with pytest.raises(IntegrityError), transaction.atomic():
        sample(
            domain.ServiceScheduleEntry,
            branches[0],
            starts_at=timezone.now(),
            ends_at=timezone.now() - timedelta(hours=1),
        )
    with pytest.raises(IntegrityError), transaction.atomic():
        sample(domain.TrainingAssignment, branches[0], progress_percent=101)
    with pytest.raises(IntegrityError), transaction.atomic():
        sample(
            domain.ClientAuthorization,
            branches[0],
            valid_from=timezone.localdate(),
            valid_until=timezone.localdate() - timedelta(days=1),
        )


def test_repeated_training_is_supported(branches):
    assignment = sample(domain.TrainingAssignment, branches[0])
    second = sample(
        domain.TrainingAssignment,
        branches[0],
        caregiver=assignment.caregiver,
        course_version=assignment.course_version,
    )
    assert second.pk != assignment.pk


def test_delivery_deduplication_and_simulation(branches):
    notification = sample(domain.Notification, branches[0])
    delivery = sample(
        domain.NotificationDelivery, branches[0], notification=notification, channel="email"
    )
    assert delivery.simulated is True
    with pytest.raises(IntegrityError), transaction.atomic():
        sample(domain.Notification, branches[0], deduplication_key=notification.deduplication_key)
    with pytest.raises(IntegrityError), transaction.atomic():
        sample(domain.NotificationDelivery, branches[0], notification=notification, channel="email")


def test_catalog_does_not_impose_requirements():
    assert (
        domain.DocumentType.objects.filter(code__in=["auto_insurance", "drivers_insurance"]).count()
        == 2
    )
    assert not domain.BranchDocumentRequirement.objects.exists()


def test_document_requires_exactly_one_owner(branches):
    with pytest.raises(IntegrityError), transaction.atomic():
        sample(domain.Document, branches[0], caregiver=None, client=None)
    with pytest.raises(IntegrityError), transaction.atomic():
        sample(domain.Document, branches[0], client=sample(domain.Client, branches[0]))


def test_draft_cannot_move_state(branches):
    application = sample(domain.CaregiverApplication, branches[0])
    with pytest.raises(IntegrityError), transaction.atomic():
        domain.CaregiverApplication.objects.filter(pk=application.pk).update(branch=branches[1])


def test_certificate_requires_completed_training(branches):
    assignment = sample(domain.TrainingAssignment, branches[0])
    with pytest.raises(IntegrityError), transaction.atomic():
        sample(domain.TrainingCertificate, branches[0], assignment=assignment)


def test_signature_rejects_unrequested_signer(branches):
    with pytest.raises(IntegrityError), transaction.atomic():
        sample(
            domain.SignatureEvent,
            branches[0],
            signer=sample(apps.get_model("accounts", "User"), branches[0]),
        )


def test_authorization_cannot_use_another_clients_document(branches):
    wrong_client = sample(domain.Client, branches[0])
    document = sample(domain.Document, branches[0], caregiver=None, client=wrong_client)
    version = sample(domain.DocumentVersion, branches[0], document=document)
    with pytest.raises(IntegrityError), transaction.atomic():
        sample(domain.AuthorizationDocument, branches[0], document_version=version)
