"""Published illustrative branch content, with no private record data."""

from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import BranchContent
from .serializers.content import BranchContentSerializer


# Expose published illustrative branch copy through a read-only public endpoint.
class BranchContentList(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = BranchContentSerializer
    filterset_fields = ["branch__state_code"]

    # Filter publication and active branches before applying any public state filter.
    def get_queryset(self):
        return BranchContent.objects.filter(
            branch__active=True, publication_status="published"
        ).select_related("branch").order_by("branch__state_code", "content_key", "public_id")
