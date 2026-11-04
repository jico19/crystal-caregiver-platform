import uuid
import threading

_thread_locals = threading.local()

def get_current_request():
    """Retrieve the current thread's active Django request object, if any."""
    return getattr(_thread_locals, "request", None)

def get_client_ip(request):
    """Safely extract remote IP address from HTTP headers."""
    if not request:
        return None
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")

class AuditContextMiddleware:
    """Captures request context in thread-local storage for HIPAA compliance audit logging."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not hasattr(request, "request_id"):
            request.request_id = uuid.uuid4()
        _thread_locals.request = request
        try:
            response = self.get_response(request)
            return response
        finally:
            _thread_locals.request = None
