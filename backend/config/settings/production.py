"""Deployment baseline only; hosting and service configuration remain pending."""
from .base import *  # noqa: F403
import os

from django.core.exceptions import ImproperlyConfigured

from .base import required_env

ALLOWED_HOSTS = [host.strip() for host in required_env("DJANGO_ALLOWED_HOSTS").split(",") if host.strip()]
if not ALLOWED_HOSTS or "*" in ALLOWED_HOSTS:
    raise ImproperlyConfigured("Provide explicit DJANGO_ALLOWED_HOSTS.")
DATABASES = {"default": {
    "ENGINE": "django.db.backends.postgresql",
    "NAME": required_env("DB_NAME"),
    "USER": required_env("DB_USER"),
    "PASSWORD": required_env("DB_PASSWORD"),
    "HOST": required_env("DB_HOST"),
    "PORT": os.environ.get("DB_PORT", "5432"),
    "OPTIONS": {"sslmode": "verify-full"},
}}
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
