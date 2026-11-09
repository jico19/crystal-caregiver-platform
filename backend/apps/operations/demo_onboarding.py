"""Idempotent illustrative branch defaults; never rewrite published form versions."""

from django.utils import timezone
from .application_forms import EXTENDED_SCHEMA
from .models import FormVersion, DocumentType, BranchDocumentRequirement, BranchOnboardingPolicy
from .private_files import FIXTURES, write_private


def seed_application_version(branch, template):
    version = FormVersion.objects.filter(template=template, version_number=2).first()
    if version:
        return version
    packet = FIXTURES / f"packet-{branch.state_code}-v2.pdf"
    stored, path = write_private(branch, None, packet.name, "application/pdf", packet.read_bytes())
    try:
        return FormVersion.objects.create(branch=branch, template=template, version_number=2, field_schema=EXTENDED_SCHEMA, instruction_text="Demo workflow - pending agency confirmation. Synthetic data only.", packet_file=stored, published_at=timezone.now())
    except Exception:
        path.unlink(missing_ok=True)
        raise


def seed_requirements(branch):
    BranchOnboardingPolicy.objects.get_or_create(branch=branch)
    for category in DocumentType.objects.filter(audience="caregiver"):
        required = category.code in {"drivers_license", "cpr", "cna_hha"}
        BranchDocumentRequirement.objects.get_or_create(branch=branch, document_type=category, defaults={"required": required, "tracks_expiration": required})
