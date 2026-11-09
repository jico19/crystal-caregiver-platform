"""Private immutable bytes, opened only after domain authorization."""

import hashlib
import uuid
from contextvars import ContextVar
from functools import wraps
from pathlib import Path
from django.conf import settings
from django.http import FileResponse
from rest_framework.exceptions import NotFound
from .models import StoredFile

FIXTURES = Path(__file__).parent / "fixtures" / "demo"
_writes = ContextVar("private_file_writes", default=None)


def cleanup_private_writes(function):
    @wraps(function)
    def wrapped(*args, **kwargs):
        paths = []
        token = _writes.set(paths)
        try:
            return function(*args, **kwargs)
        except Exception:
            for path in paths:
                path.unlink(missing_ok=True)
            raise
        finally:
            _writes.reset(token)
    return wrapped


def private_root():
    root = Path(getattr(settings, "PRIVATE_FILE_ROOT", settings.BASE_DIR / ".local" / "private-files"))
    root.mkdir(parents=True, exist_ok=True)
    return root


def write_private(branch, actor, filename, media_type, data):
    key = uuid.uuid4().hex
    path = private_root() / key
    try:
        path.write_bytes(data)
        if _writes.get() is not None:
            _writes.get().append(path)
        stored = StoredFile.objects.create(branch=branch, uploaded_by=actor, private_storage_key=key, original_name=filename, content_type=media_type, byte_size=len(data), sha256=hashlib.sha256(data).hexdigest(), validation_status="approved")
    except Exception:
        path.unlink(missing_ok=True)
        raise
    return stored, path


def attachment(stored):
    # Caller must scope the owning application/document BEFORE reaching here.
    key = stored.private_storage_key
    if len(key) != 32 or any(c not in "0123456789abcdef" for c in key):
        raise NotFound("Demo attachment unavailable.")
    try:
        stream = (private_root() / key).open("rb")
    except FileNotFoundError:
        raise NotFound("Demo attachment unavailable.") from None
    response = FileResponse(stream, as_attachment=True, filename=stored.original_name, content_type=stored.content_type)
    response["Cache-Control"] = "private, no-store"
    response["X-Content-Type-Options"] = "nosniff"
    return response
