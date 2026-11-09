from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from apps.accounts.services import create_user
from apps.accounts.models import User
from ..models import Caregiver, CaregiverApplication, JobSubmission, ApplicationReview, JobPosting
from .common import audit, retry_locked
from .application_forms import application_answers


# Atomically validate availability, create version-bound application data, and record submission history.
@retry_locked
@transaction.atomic
def apply_to_job(job, data, user):
    job = JobPosting.objects.select_for_update().select_related("branch", "form_version__template").get(pk=job.pk)
    if not job.published or not job.branch.active or not job.form_version.published_at or not job.form_version.template.active:
        raise ValidationError("This job is no longer accepting applications. Refresh the opportunities list.")
    if user.is_authenticated and not user.is_active:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("Active account required.")
    answers = application_answers(job.form_version, data)
    if user.is_authenticated:
        if user.email.lower() != data["email"].lower():
            raise ValidationError({"email": "Use your signed-in account email."})
    else:
        user = create_user(data["email"], data["password"])
    # Lock the user to serialize duplicate submissions on PostgreSQL.
    User.objects.select_for_update().get(pk=user.pk)
    caregiver, _ = Caregiver.objects.get_or_create(
        user=user, branch=job.branch, defaults={"name": data["name"], "email": user.email}
    )
    if not caregiver.active:
        raise ValidationError("This caregiver account is inactive.")
    if JobSubmission.objects.filter(job=job, caregiver=caregiver).exists():
        raise ValidationError("You already applied to this job.")
    application = CaregiverApplication.objects.create(
        branch=job.branch,
        caregiver=caregiver,
        form_version=job.form_version,
        submitted_answers=answers,
        status="submitted",
        submitted_at=timezone.now(),
    )
    JobSubmission.objects.create(
        branch=job.branch, job=job, caregiver=caregiver, application=application
    )
    ApplicationReview.objects.create(branch=job.branch, application=application, reviewer=user, previous_status="draft", new_status="submitted", reviewed_at=timezone.now())
    audit(user, "application.submitted", application, job.branch, "application")
    return user, application
