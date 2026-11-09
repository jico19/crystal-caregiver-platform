from django.http import JsonResponse
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        code = getattr(exc, "default_code", "invalid")
        detail = response.data
        if response.status_code == 403 and isinstance(detail, dict) and str(detail.get("detail", "")).startswith("CSRF Failed"):
            code, detail = "csrf_failed", {"detail": "Refresh the page and try again."}
        response.data = {"error": {"code": code, "details": detail}}
    return response


def csrf_failure(request, reason=""):
    return JsonResponse({"error": {"code": "csrf_failed", "details": {"detail": "Refresh the page and try again."}}}, status=403)
