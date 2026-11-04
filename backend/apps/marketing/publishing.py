"""Publish public content to files served independently of Django and its DB."""
import hashlib
import json
import os
from pathlib import Path
import re
import tempfile

from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import WebsiteContent, Service, Form, LicensingInfo, JobPosting

DRAFT_SECTION = "public_site_draft"
PUBLIC_STATES = {
    "florida": {"code": "FL", "name": "Florida", "slug": "florida"},
    "indiana": {"code": "IN", "name": "Indiana", "slug": "indiana"},
    "georgia": {"code": "GA", "name": "Georgia", "slug": "georgia"},
}
ASSET_PATTERN = re.compile(r"^[a-f0-9]{64}\.pdf$")
MAX_PDF_BYTES = 15 * 1024 * 1024


def revision_for(draft):
    canonical = json.dumps(draft, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def draft_for(state):
    saved = WebsiteContent.objects.filter(
        state=state, section_key=DRAFT_SECTION, deleted_at__isnull=True,
    ).order_by("-updated_at", "-id").first()
    if saved is not None:
        return saved.metadata["draft"], saved
    hero = WebsiteContent.objects.filter(
        state=state, section_key="hero", deleted_at__isnull=True,
    ).order_by("-updated_at").first()
    return {
        "overview": {"title": hero.title if hero else f"Home care in {state.name}", "description": hero.content if hero else ""},
        "contact": {"phone": "", "email": "", "address": "", "office_hours": ""},
        "services": [{"id": str(row.pk), "title": row.title, "description": row.description}
                     for row in Service.objects.filter(state=state, active=True, deleted_at__isnull=True)],
        "licensing": [{"id": str(row.pk), "license_number": row.license_number, "issuing_authority": row.issuing_authority,
                       "status": row.status, "disclosures": row.disclosures or ""}
                      for row in LicensingInfo.objects.filter(state=state).order_by("created_at", "id")],
        "careers": [{"id": str(row.pk), "title": row.title, "description": row.description,
                     "department": row.department, "employment_type": row.employment_type,
                     "requirements": row.requirements, "compensation": row.compensation or ""}
                    for row in JobPosting.objects.filter(state=state, active=True, deleted_at__isnull=True)],
        # Legacy links are never copied from private media into public storage.
        "forms": [{"id": str(row.pk), "title": row.title, "description": row.description or "",
                   "category": "general", "asset_key": "", "filename": ""}
                  for row in Form.objects.filter(state=state, deleted_at__isnull=True).order_by("created_at", "id")],
    }, None


def publication_for(slug):
    try:
        snapshot = json.loads((Path(settings.PUBLISHED_SITE_ROOT) / f"{slug}.json").read_text(encoding="utf-8"))
        return {"published_at": snapshot.get("published_at"), "revision": snapshot.get("revision"), "url": f"/{slug}"}
    except (OSError, ValueError, AttributeError):
        return {"published_at": None, "revision": None, "url": f"/{slug}"}


def editor_payload(state, slug):
    draft, saved = draft_for(state)
    revision = revision_for(draft)
    publication = publication_for(slug)
    return {"state": PUBLIC_STATES[slug], "draft": draft, "revision": revision,
            "saved_at": saved.updated_at.isoformat() if saved else None,
            "publication": dict(publication, has_changes=revision != publication["revision"])}


def atomic_write(path, data, *, public=False):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".publishing-", delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        if public:
            temporary.chmod(0o644)
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def store_draft_pdf(upload):
    if upload.size > MAX_PDF_BYTES:
        raise ValidationError({"file": "Public PDFs must be 15 MB or smaller."})
    data = upload.read(MAX_PDF_BYTES + 1)
    if len(data) > MAX_PDF_BYTES or not data.startswith(b"%PDF-") or Path(upload.name).suffix.lower() != ".pdf":
        raise ValidationError({"file": "Choose a valid PDF file."})
    key = hashlib.sha256(data).hexdigest() + ".pdf"
    atomic_write(Path(settings.PUBLIC_SITE_DRAFT_ASSET_ROOT) / key, data)
    return {"asset_key": key, "filename": Path(upload.name.replace("\\", "/")).name}


def publish_draft(slug, draft):
    public_root = Path(settings.PUBLISHED_SITE_ROOT)
    forms = []
    assets = {}
    for form in draft["forms"]:
        key = form.get("asset_key", "")
        if not ASSET_PATTERN.fullmatch(key):
            raise ValidationError({"forms": f"Upload a public PDF for {form['title']} before publishing."})
        staged = Path(settings.PUBLIC_SITE_DRAFT_ASSET_ROOT) / key
        source = staged if staged.is_file() else public_root / "assets" / key
        if not source.is_file():
            raise ValidationError({"forms": f"The PDF for {form['title']} is missing. Upload it again."})
        data = source.read_bytes()
        if hashlib.sha256(data).hexdigest() + ".pdf" != key:
            raise ValidationError({"forms": "A public PDF has changed. Upload it again before publishing."})
        assets[key] = data
        forms.append({"id": form["id"], "title": form["title"], "description": form["description"],
                      "category": form["category"], "file_url": f"/published-site/assets/{key}"})
    snapshot = {
        "schema_version": 1, "state": PUBLIC_STATES[slug], "published_at": timezone.now().isoformat(),
        "revision": revision_for(draft), "overview": draft["overview"], "contact": draft["contact"],
        "services": draft["services"], "licensing": draft["licensing"], "careers": draft["careers"], "forms": forms,
    }
    for key, data in assets.items():
        destination = public_root / "assets" / key
        if not destination.is_file():
            atomic_write(destination, data, public=True)
    # Assets are immutable; replace the state document only after all are ready.
    atomic_write(public_root / f"{slug}.json", json.dumps(snapshot, ensure_ascii=False, indent=2).encode("utf-8"), public=True)
    return snapshot
