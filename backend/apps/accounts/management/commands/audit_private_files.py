"""Read-only orphan accounting; never deletes referenced or unreferenced bytes."""
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.operations.models import StoredFile
from apps.operations.services.private_files import private_root


# Expose a dry-run orphan-byte count without deleting files.
class Command(BaseCommand):
    help = "Dry-run count of unreferenced private files older than 24 hours. Never deletes."

    # Count old unreferenced keys without exposing document contents or paths.
    def handle(self, *args, **options):
        keys = set(StoredFile.objects.values_list("private_storage_key", flat=True))
        cutoff = (timezone.now() - timedelta(hours=24)).timestamp()
        orphan_count = sum(1 for path in private_root().iterdir() if path.is_file() and path.name not in keys and path.stat().st_mtime < cutoff)
        self.stdout.write(f"Dry run: {orphan_count} unreferenced private files older than 24 hours. No files deleted.")
