import os

MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
ALLOWED_FILE_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}


def validate_uploaded_bytes(file_bytes: bytes, filename: str):
    """Enforce the existing filename, size and magic-byte checks."""
    if len(file_bytes) > MAX_UPLOAD_SIZE_BYTES:
        return False, "File exceeds maximum size limit of 15MB."
    if len(file_bytes) < 4:
        return False, "File is empty or corrupted."

    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_FILE_EXTENSIONS:
        return False, (
            f"File extension '{ext}' is not permitted. "
            "Only PDF and standard image files are allowed."
        )

    if ext == ".pdf" and not file_bytes.startswith(b"%PDF-"):
        return False, "File header does not match valid PDF signature."
    elif ext in (".jpg", ".jpeg") and not file_bytes.startswith(b"\xff\xd8"):
        return False, "File header does not match valid JPEG signature."
    elif ext == ".png" and not file_bytes.startswith(b"\x89PNG"):
        return False, "File header does not match valid PNG signature."

    return True, None
