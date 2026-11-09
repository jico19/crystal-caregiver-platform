"""Default-deny business access, independent of Django admin flags."""

from django.db.models import Q
from apps.operations.models import AgencyAdmin, BranchStaff, StateBranch


# Return active branches administered through business assignments, independent of Django flags.
def admin_branches(user):
    if not user.is_authenticated or not user.is_active:
        return StateBranch.objects.none()
    agencies = AgencyAdmin.objects.filter(user=user, active=True).values("agency_id")
    states = BranchStaff.objects.filter(user=user, active=True, role="administrator").values(
        "branch_id"
    )
    return StateBranch.objects.filter(active=True).filter(
        Q(agency_id__in=agencies) | Q(id__in=states)
    )


# Restrict person queries to active owned records or branches the caller administers.
def scope_people(queryset, user):
    if not user.is_authenticated or not user.is_active:
        return queryset.none()
    return queryset.filter(branch__active=True).filter(
        Q(branch__in=admin_branches(user)) | Q(user=user, active=True)
    )


