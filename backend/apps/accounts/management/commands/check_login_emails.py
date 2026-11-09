from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count
from django.db.models.functions import Lower, Trim
from apps.accounts.models import User


# Expose a read-only preflight for blank/duplicate normalized login emails.
class Command(BaseCommand):
    help = "Read-only email login preflight; reports IDs only, never rewrites existing accounts."

    # Report remediation needs without rewriting accounts or printing email values.
    def handle(self, *args, **options):
        blank = list(User.objects.filter(email="").values_list("pk", flat=True))
        duplicates = (
            User.objects.exclude(email="")
            .annotate(normalized=Lower(Trim("email")))
            .values("normalized")
            .annotate(total=Count("pk"))
            .filter(total__gt=1)
            .count()
        )
        if blank or duplicates:
            raise CommandError(
                f"Email remediation required: blank email user IDs={blank}; duplicate normalized groups={duplicates}. Assign verified synthetic emails explicitly before email login/migration."
            )
        self.stdout.write("Email login preflight passed. No accounts changed.")
