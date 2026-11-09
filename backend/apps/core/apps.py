from django.apps import AppConfig


# Register shared API infrastructure with Django.
class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
