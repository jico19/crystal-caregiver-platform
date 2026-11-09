from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from .serializers.health import HealthOutput


@extend_schema(responses=HealthOutput)
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def health(request):
    """Public liveness check, without database or environment details."""
    return Response({"status": "ok"})
