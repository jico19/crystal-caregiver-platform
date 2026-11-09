"""DRF permission checks based on active business administrator assignments."""

from rest_framework.permissions import BasePermission
from .access import admin_branches


# Translate the shared branch-access policy into endpoint and object permissions.
class IsBusinessAdmin(BasePermission):
    # Require at least one business administrator assignment.
    def has_permission(self, request, view):
        return admin_branches(request.user).exists()

    # Require administrator access to the object's branch.
    def has_object_permission(self, request, view, obj):
        return admin_branches(request.user).filter(pk=obj.branch_id).exists()
