from rest_framework.exceptions import PermissionDenied

class ScopedStateQuerySetMixin:
    """
    Automatically restricts queryset results to the state assigned to the administrator.
    """
    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if not user or not user.is_authenticated:
            return qs.none()

        role_name = getattr(user.role, "name", None)
        
        if role_name == "super_admin":
            return qs
        if role_name == "administrator" and user.state_id:
            return qs.filter(state_id=user.state_id)
        
        raise PermissionDenied("User does not have an active jurisdictional scope.")
