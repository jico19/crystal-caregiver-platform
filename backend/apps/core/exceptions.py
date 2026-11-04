import uuid
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

def custom_exception_handler(exc, context):
    """
    Standardizes error responses to RFC 7807 / structured error payloads.
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_payload = {
            "request_id": str(uuid.uuid4()),
            "status_code": response.status_code,
        }

        if isinstance(response.data, dict):
            if "detail" in response.data:
                error_payload["detail"] = response.data["detail"]
                if "error_code" in response.data:
                    error_payload["error_code"] = response.data["error_code"]
                else:
                    error_payload["error_code"] = (
                        "FORBIDDEN_STATE_BOUNDARY"
                        if response.status_code == status.HTTP_403_FORBIDDEN
                        else "API_ERROR"
                    )
            else:
                error_payload["detail"] = "Validation failed"
                error_payload["error_code"] = "VALIDATION_ERROR"
                error_payload["errors"] = response.data
        elif isinstance(response.data, list):
            error_payload["detail"] = response.data[0] if response.data else "Validation error"
            error_payload["error_code"] = "VALIDATION_ERROR"
            error_payload["errors"] = response.data
        else:
            error_payload["detail"] = str(response.data)
            error_payload["error_code"] = "API_ERROR"

        response.data = error_payload

    return response
