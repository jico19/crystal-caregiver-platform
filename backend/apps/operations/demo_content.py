"""Configurable demo copy; these defaults make no agency policy claims."""

from .models import BranchContent


def seed_branch_content(branch):
    name = {"FL": "Florida", "IN": "Indiana", "GA": "Georgia"}[branch.state_code]
    defaults = {
        "services": ("Demo services", f"{name}: illustrative daily-living support, companionship and care coordination. Service availability awaits agency confirmation."),
        "forms": ("Demo forms", f"{name}: apply through a public caregiver opportunity using synthetic details. Other forms await agency confirmation."),
        "licensing": ("Licensing information pending", f"Official {name} licensing information has not been supplied. This prototype does not represent licensure or service authorization."),
        "contact": ("Contact information pending", f"Official {name} agency contact details await confirmation. Do not submit real care information through this demo."),
    }
    for key, (title, body) in defaults.items():
        BranchContent.objects.get_or_create(
            branch=branch, content_key=key,
            defaults={"title": title, "body": body, "publication_status": "published"},
        )
