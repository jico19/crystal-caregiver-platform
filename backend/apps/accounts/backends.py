from django.contrib.auth.backends import ModelBackend
from .models import User


# Authenticate with email while retaining Django's active-user policy.
class EmailBackend(ModelBackend):
    # Use case-insensitive email lookup and hash missing-user input to reduce timing differences.
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            user = User.objects.get(email__iexact=(username or "").strip())
        except User.DoesNotExist:
            User().set_password(password)
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
