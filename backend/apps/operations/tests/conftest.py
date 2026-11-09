import pytest
from apps.accounts.test_foundation import graph, config
from apps.operations.demo_onboarding import seed_requirements, seed_application_version
from apps.operations.models import CaregiverApplication
from apps.operations.services import apply_to_job


@pytest.fixture
def onboarding(graph):
    job = graph["job"]
    seed_requirements(job.branch)
    version = seed_application_version(job.branch, job.form_version.template)
    job.form_version = version
    job.save(update_fields=["form_version"])
    actor = graph["owner"]
    _, application = apply_to_job(job, {"name": "Synthetic applicant", "email": actor.email, "demo_acknowledged": True, "experience": "none", "availability": ["weekdays"]}, actor)
    graph["application"] = application
    graph["caregiver"] = application.caregiver
    return graph
