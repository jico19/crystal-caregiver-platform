from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed

class StrictJWTAuthentication(JWTAuthentication):
    """
    HIPAA-compliant JWT authenticator.
    Enforces that user accounts must be active, unsuspended, and not soft-deleted
    on every authenticated API request.
    """
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if not getattr(user, "is_authenticated_and_active", True):
            raise AuthenticationFailed(
                "User account is inactive, suspended, or has been deleted.",
                code="user_inactive",
            )
        return user
