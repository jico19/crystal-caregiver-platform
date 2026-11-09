from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied

class IsSuperAdmin(BasePermission):
    """Allows access only to users with role super_admin."""
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        role_name = getattr(user.role, "name", None)
        return role_name == "super_admin"

class IsStateScopedAdmin(BasePermission):
    """
    Grants access to super_admin across all states,
    or administrators strictly within their assigned state jurisdiction.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        role_name = getattr(user.role, "name", None)
        if role_name == "super_admin":
            return True
        if role_name == "administrator":
            if user.state_id is None:
                raise PermissionDenied("Administrator is not assigned to a state jurisdiction.")
            return True
        return False

    def has_object_permission(self, request, view, obj):
        role_name = getattr(request.user.role, "name", None)
        if role_name == "super_admin":
            return True
        if role_name == "administrator":
            return getattr(obj, "state_id", None) == request.user.state_id
        return False

class IsCaregiver(BasePermission):
    """Allows access only to authenticated caregivers."""
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        role_name = getattr(user.role, "name", None)
        return role_name in ("caregiver", "super_admin")

class IsClient(BasePermission):
    """Allows access only to authenticated clients."""
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        role_name = getattr(user.role, "name", None)
        return role_name in ("client", "super_admin")
