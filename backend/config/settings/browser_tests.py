"""Local browser-test server only. Session/CSRF behavior matches development."""
from .development import *  # noqa: F403
from .development import REST_FRAMEWORK

# Multi-viewport journeys intentionally perform many local synthetic sign-ins.
# This module is selected explicitly only by Playwright on its isolated port.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_RATES": {"anon": "10000/hour", "user": "10000/hour", "auth": "10000/hour"},
}
