"""Repeatable synthetic data. Passwords are generated only for new users."""
import secrets
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from apps.accounts.models import User
from apps.operations.models import Agency, StateBranch, AgencyAdmin, BranchStaff, Caregiver, Client, FormTemplate, FormVersion, JobPosting


class Command(BaseCommand):
    help = "Seed synthetic local demo accounts; never overwrite existing passwords."

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Demo seeds are disabled outside development.")
        agency, _ = Agency.objects.get_or_create(name="Crystal Care Demo")
        admin = self.account("agency-admin")
        AgencyAdmin.objects.get_or_create(agency=agency, user=admin)
        for state in ("FL", "IN", "GA"):
            branch, _ = StateBranch.objects.get_or_create(agency=agency, state_code=state,
                defaults={"display_name": {"FL": "Florida", "IN": "Indiana", "GA": "Georgia"}[state], "timezone": "America/New_York"})
            staff = self.account(f"state-admin-{state.lower()}")
            BranchStaff.objects.get_or_create(branch=branch, user=staff, defaults={"role": "administrator"})
            for role, model in [("caregiver", Caregiver), ("client", Client)]:
                for number in (1, 2):
                    user = self.account(f"{role}-{state.lower()}-{number}")
                    model.objects.get_or_create(branch=branch, user=user,
                        defaults={"name": f"Demo {state} {role.title()} {number}", "email": user.email})
            template, _ = FormTemplate.objects.get_or_create(branch=branch, kind="job-application", audience="caregiver",
                defaults={"title": "Synthetic caregiver application"})
            version, _ = FormVersion.objects.get_or_create(branch=branch, template=template, version_number=1,
                defaults={"field_schema": {"fields": ["name", "email", "demo_acknowledged"]}, "instruction_text": "Synthetic data only.", "published_at": timezone.now()})
            JobPosting.objects.get_or_create(branch=branch, title=f"Demo caregiver opportunity — {state}", defaults={
                "description": "Illustrative job posting for a home-care agency demo. No real vacancy, qualifications, pay or licensing requirements are represented.",
                "published": True, "form_version": version})
        self.stdout.write("Demo seed complete. Existing passwords and assignments were preserved.")

    def account(self, label):
        email = f"{label}@demo.example"
        user, created = User.objects.get_or_create(username=f"demo-{label}", defaults={"email": email})
        if created:
            password = secrets.token_urlsafe(20)
            user.set_password(password)
            user.save(update_fields=["password"])
            self.stdout.write(f"NEW LOCAL ACCOUNT {email}  Password: {password}")
        return user
