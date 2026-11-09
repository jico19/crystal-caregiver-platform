"""Published illustrative branch content, with no private record data."""

from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import BranchContent
from .content_serializers import BranchContentSerializer


class BranchContentList(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = BranchContentSerializer
    filterset_fields = ["branch__state_code"]

    def get_queryset(self):
        return BranchContent.objects.filter(
            branch__active=True, publication_status="published"
        ).select_related("branch").order_by("branch__state_code", "content_key", "public_id")
