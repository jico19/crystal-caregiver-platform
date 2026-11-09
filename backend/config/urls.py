from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({
        "status": "healthy",
        "service": "Caregiver Platform DRF Core",
        "api_version": "v1",
    })

urlpatterns = [

    path("django-admin/", admin.site.urls),
    path("api/health/", health_check, name="api_health"),

    # REST API v1 Endpoints
    path("api/v1/auth/", include("apps.authentication.urls")),
    path("api/v1/states/", include("apps.marketing.urls")),
    path("api/v1/caregivers/", include("apps.caregivers.urls")),
    path("api/v1/clients/", include("apps.clients.urls")),
    path("api/v1/documents/", include("apps.documents.urls")),
    path("api/v1/training/", include("apps.training.urls")),
    path("api/v1/", include("apps.compliance.urls")),
    path("api/v1/admin/", include("apps.care.urls")),
    path("api/v1/admin/", include("apps.admin_portal.urls")),
]

