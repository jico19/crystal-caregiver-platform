"""Isolated SQLite database: real threaded service operations without test transactions."""
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier

os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.development"
import django
django.setup()
from django.conf import settings
from django.utils import timezone
from django.core.management import call_command
from django.db import connections
from rest_framework.exceptions import APIException
from apps.accounts.models import User
from apps.operations.models import Agency, StateBranch, BranchStaff, Caregiver, FormTemplate, FormVersion, JobPosting, CaregiverApplication
from apps.operations.demo_onboarding import seed_requirements
from apps.operations.services import apply_to_job
from apps.operations.services.documents import upload_document, review_document
from apps.operations.services.transitions import transition_application
from apps.operations.services.checklist import complete_onboarding
from apps.operations.tests.test_onboarding import fixture

root = Path(sys.argv[1])
settings.DATABASES["default"]["NAME"] = root / "concurrency.sqlite3"
settings.PRIVATE_FILE_ROOT = root / "private"
settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
connections.close_all()
call_command("migrate", verbosity=0)
agency = Agency.objects.create(name="Synthetic concurrency")
branch = StateBranch.objects.create(agency=agency, state_code="FL", display_name="Demo", timezone="UTC")
owner = User.objects.create_user(username="owner", email="owner@demo.example")
admin = User.objects.create_user(username="admin", email="admin@demo.example")
BranchStaff.objects.create(branch=branch, user=admin, role="administrator")
template = FormTemplate.objects.create(branch=branch, audience="caregiver", kind="job", title="Demo")
version = FormVersion.objects.create(branch=branch, template=template, version_number=1, published_at=timezone.now())
job = JobPosting.objects.create(branch=branch, form_version=version, title="Demo", description="Demo", published=True)
_, application = apply_to_job(job, {"name": "Synthetic", "email": owner.email}, owner)
caregiver = application.caregiver
seed_requirements(branch)


# Start two service calls together to exercise real SQLite contention outside test transactions.
def race(function):
    barrier = Barrier(2)
    # Synchronize the call, retain API failure status, and close its thread's database connections.
    def worker():
        barrier.wait()
        try:
            return function()
        except APIException as exc:
            return exc.status_code
        finally:
            connections.close_all()
    with ThreadPoolExecutor(max_workers=2) as executor:
        return list(executor.map(lambda _: worker(), range(2)))


versions = race(lambda: upload_document(owner, caregiver.public_id, fixture()).version_number)
assert sorted(versions) == [1, 2]
document = caregiver.document_set.get(document_type__code="cpr")
latest = document.documentversion_set.order_by("-version_number").first()
results = race(lambda: (review_document(admin, latest.public_id, {"expected_status": "pending", "decision": "approved", "comment": ""}), 201)[1])
assert sorted(results) == [201, 409]
results = race(lambda: (transition_application(admin, application.public_id, {"expected_status": "submitted", "new_status": "under_review", "comment": ""}), 200)[1])
assert sorted(results) == [200, 409]
transition_application(admin, application.public_id, {"expected_status": "under_review", "new_status": "approved", "comment": ""})
for code in ("drivers_license", "cna_hha"):
    document_version = upload_document(owner, caregiver.public_id, fixture(code))
    review_document(admin, document_version.public_id, {"expected_status": "pending", "decision": "approved", "comment": ""})
results = race(lambda: (complete_onboarding(admin, caregiver.public_id, {"expected_status": "onboarding"}), 200)[1])
assert sorted(results) == [200, 409]
print("SQLite concurrency checks passed.")
