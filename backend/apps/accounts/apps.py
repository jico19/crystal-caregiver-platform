from django.apps import AppConfig


# Register the custom-account app and its default primary-key type.
class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
