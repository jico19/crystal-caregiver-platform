import os
import logging
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired

logger = logging.getLogger(__name__)

signer = TimestampSigner(salt="caregiver-document-token")

def generate_document_token(doc_id: str, *, purpose: str) -> str:
    """Sign a document identifier for one specific operation."""
    if purpose not in ("upload", "download"):
        raise ValueError("Document token purpose must be upload or download.")
    return signer.sign(f"{purpose}:{doc_id}")

def verify_document_token(doc_id: str, token: str, *, purpose: str, max_age=None) -> bool:
    """Verify the document, operation, and advertised lifetime together."""
    if not token or not doc_id:
        return False
    if purpose not in ("upload", "download"):
        return False
    if max_age is None:
        max_age = getattr(settings, "S3_PRESIGNED_EXPIRATION_SECONDS", 900)
    try:
        unsigned_id = signer.unsign(token, max_age=max_age)
        return unsigned_id == f"{purpose}:{doc_id}"
    except (BadSignature, SignatureExpired):
        return False


class StorageService:
    """
    Storage service supporting built-in Django media storage by default,
    with optional AWS S3 presigned URLs when USE_S3 is enabled.
    """

    def __init__(self):
        self.bucket_name = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "")
        self.region_name = getattr(settings, "AWS_S3_REGION_NAME", "us-east-1")
        self.expiration = getattr(settings, "S3_PRESIGNED_EXPIRATION_SECONDS", 900)
        self.use_s3 = getattr(settings, "USE_S3", False)
        self._client = None

    @property
    def client(self):
        if self._client is None and self.use_s3:
            if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
                import boto3
                self._client = boto3.client(
                    "s3",
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=self.region_name,
                )
        return self._client

    def generate_presigned_put_url(
        self, storage_key: str, content_type: str = "application/pdf", doc_id = None
    ) -> str:
        """
        Generates an upload URL.
        When USE_S3 is active, returns an AWS S3 presigned PUT URL.
        Otherwise, returns a signed endpoint pointing to Django media upload view.
        """
        if self.use_s3 and self.client:
            try:
                return self.client.generate_presigned_url(
                    ClientMethod="put_object",
                    Params={
                        "Bucket": self.bucket_name,
                        "Key": storage_key,
                        "ContentType": content_type,
                        "ServerSideEncryption": "aws:kms",
                    },
                    ExpiresIn=self.expiration,
                )
            except Exception as e:
                logger.error(f"Failed to generate S3 presigned PUT URL: {e}")

        # Built-in Django media storage upload endpoint
        if doc_id:
            token = generate_document_token(str(doc_id), purpose="upload")
            return f"/api/v1/documents/{doc_id}/upload-file/?token={token}"
        return f"/api/v1/documents/upload-file/"

    def generate_presigned_get_url(self, storage_key: str, doc_id = None) -> str:
        """
        Generates a download URL.
        When USE_S3 is active, returns an AWS S3 presigned GET URL.
        Otherwise, returns a signed Django media streaming view or direct media URL.
        """
        if self.use_s3 and self.client:
            try:
                return self.client.generate_presigned_url(
                    ClientMethod="get_object",
                    Params={
                        "Bucket": self.bucket_name,
                        "Key": storage_key,
                    },
                    ExpiresIn=self.expiration,
                )
            except Exception as e:
                logger.error(f"Failed to generate S3 presigned GET URL: {e}")

        # Built-in Django media storage download endpoint
        if doc_id:
            token = generate_document_token(str(doc_id), purpose="download")
            return f"/api/v1/documents/{doc_id}/file/?token={token}"
        media_url = getattr(settings, "MEDIA_URL", "/media/").rstrip("/")
        return f"{media_url}/{storage_key.lstrip('/')}"

    def save_file(self, storage_key: str, content) -> str:
        """Saves file content to default Django media storage, replacing existing."""
        if isinstance(content, (bytes, bytearray)):
            file_obj = ContentFile(content)
        elif hasattr(content, "read"):
            file_obj = content
        else:
            file_obj = ContentFile(str(content).encode("utf-8"))

        clean_key = storage_key.lstrip("/")
        if default_storage.exists(clean_key):
            default_storage.delete(clean_key)
        saved_name = default_storage.save(clean_key, file_obj)
        return saved_name

    def open_file(self, storage_key: str, mode: str = "rb"):
        """Opens a file from default Django media storage."""
        clean_key = storage_key.lstrip("/")
        return default_storage.open(clean_key, mode)

    def exists(self, storage_key: str) -> bool:
        """Check the storage backend that issued the upload URL."""
        clean_key = storage_key.lstrip("/")
        if self.use_s3 and self.client:
            from botocore.exceptions import ClientError
            try:
                self.client.head_object(Bucket=self.bucket_name, Key=clean_key)
                return True
            except ClientError as error:
                if error.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
                    return False
                raise
        return default_storage.exists(clean_key)

    def delete_file(self, storage_key: str) -> None:
        """Deletes a file from default Django media storage if present."""
        clean_key = storage_key.lstrip("/")
        if default_storage.exists(clean_key):
            default_storage.delete(clean_key)

    def get_file_url(self, storage_key: str) -> str:
        """Returns the public /media URL path for a stored file."""
        media_url = getattr(settings, "MEDIA_URL", "/media/").rstrip("/")
        return f"{media_url}/{storage_key.lstrip('/')}"


S3StorageService = StorageService
storage_service = StorageService()
