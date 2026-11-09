"""Local-only settings; access the API through Vite's same-origin proxy."""

from .base import *  # noqa: F403
from .base import BASE_DIR

(BASE_DIR / ".local").mkdir(exist_ok=True)

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]
