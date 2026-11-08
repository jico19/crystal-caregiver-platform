from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Custom user foundation; agency membership and login flows are deferred."""
