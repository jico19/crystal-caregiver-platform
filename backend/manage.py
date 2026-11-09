"""Django management entry point; defaults to local development settings."""

import os
import sys


# Dispatch Django commands using development settings unless another module is explicitly selected.
def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
