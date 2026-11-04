import uuid
from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser,
    PermissionsMixin,
    BaseUserManager,
    Group,
    Permission,
)
from django.utils import timezone
from apps.core.models import State, Role, TimeStampedModel

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, role=None, state=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address.")
        email = self.normalize_email(email).lower()
        
        if role is None:
            # Default to caregiver role if not specified
            role, _ = Role.objects.get_or_create(name="caregiver")

        user = self.model(
            email=email,
            role=role,
            state=state,
            **extra_fields,
        )
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("status", "active")

        role, _ = Role.objects.get_or_create(
            name="super_admin",
            defaults={"description": "Global super administrator"}
        )
        return self.create_user(email, password=password, role=role, state=None, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    STATUS_CHOICES = (
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("suspended", "Suspended"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(max_length=255, unique=True)
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name="users")
    state = models.ForeignKey(
        State,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deleted_users",
    )
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # Resolve reverse accessor collisions
    groups = models.ManyToManyField(
        Group,
        verbose_name="groups",
        blank=True,
        related_name="custom_user_groups",
    )
    user_permissions = models.ManyToManyField(
        Permission,
        verbose_name="user permissions",
        blank=True,
        related_name="custom_user_permissions",
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users"
        indexes = [
            models.Index(fields=["state", "role"], name="idx_users_state_role"),
        ]

    def __str__(self):
        return f"{self.email} ({self.role.name if self.role else 'no-role'})"

    @property
    def role_name(self):
        return self.role.name if self.role else None

    @property
    def is_authenticated_and_active(self):
        return self.is_active and self.status == "active" and self.deleted_at is None
