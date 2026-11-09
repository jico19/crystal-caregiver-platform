from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from apps.accounts.services import create_user, audit
from apps.accounts.models import User
from .models import Caregiver, CaregiverApplication, JobSubmission


@transaction.atomic
def apply_to_job(job, data, user):
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
        submitted_answers={"name": data["name"], "demo_acknowledged": True},
        status="submitted",
        submitted_at=timezone.now(),
    )
    JobSubmission.objects.create(
        branch=job.branch, job=job, caregiver=caregiver, application=application
    )
    audit(user, "application.submitted", application.public_id, job.branch)
    return user, application
