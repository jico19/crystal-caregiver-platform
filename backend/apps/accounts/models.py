import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower


class User(AbstractUser):
    """Email login; username remains an internal compatibility identifier."""

    class Meta:
        constraints = [
            models.UniqueConstraint(
                Lower("email"), condition=~models.Q(email=""), name="user_email_ci_unique"
            )
        ]


# Persist a branch-scoped invitation using a token hash and explicit expiry/acceptance times.
class Invitation(models.Model):
    public_id = models.UUIDField(unique=True, editable=False, default=uuid.uuid4)
    email = models.EmailField()
    branch = models.ForeignKey("operations.StateBranch", on_delete=models.PROTECT)
    role = models.CharField(
        max_length=24, choices=[("client", "Client"), ("administrator", "State administrator")]
    )
    token_hash = models.CharField(max_length=64, unique=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True)
