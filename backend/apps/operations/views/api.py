from django.contrib.auth import login
from drf_spectacular.utils import extend_schema
from apps.accounts.serializers.outputs import ApplicationOutput
from django.db.models import Q, Prefetch
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from apps.accounts.access import admin_branches, scope_people
from apps.accounts.permissions import IsBusinessAdmin
from apps.accounts.views import PublicAuthView, identity
from ..models import JobPosting, Caregiver, Client, CaregiverApplication, ApplicationReview
from ..serializers.reviews import TransitionInput
from ..services import apply_to_job
from ..serializers.applications import ApplicationInput, ApplicationSerializer, ApplicationDetailSerializer
from ..serializers.jobs import JobSerializer, JobDetailSerializer
from ..serializers.people import PersonSerializer, ClientSerializer


# Select opportunities with an active branch and available published form version.
def published_jobs():
    return (
        JobPosting.objects.filter(
            published=True,
            branch__active=True,
            form_version__published_at__isnull=False,
            form_version__template__active=True,
        )
        .select_related("branch", "form_version")
        .order_by("title", "public_id")
    )


# Expose read-only published opportunities with list/detail representations.
class JobViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = JobSerializer
    lookup_field = "public_id"
    filterset_fields = ["branch__state_code"]
    queryset = published_jobs()

    # Include the published application form only in a job detail response.
    def get_serializer_class(self):
        return JobDetailSerializer if self.action == "retrieve" else JobSerializer


# Handle submission HTTP input/session output while services own application rules.
class ApplyView(PublicAuthView):
    serializer_class = ApplicationInput

    # Resolve an available job, validate input, submit through the service, and establish the session.
    @extend_schema(responses={201: ApplicationOutput})
    def post(self, request, public_id):
        job = get_object_or_404(published_jobs(), public_id=public_id)
        data = ApplicationInput(data=request.data, context={"request": request})
        data.is_valid(raise_exception=True)
        user, application = apply_to_job(job, data.validated_data, request.user)
        login(request, user, backend="apps.accounts.backends.EmailBackend")
        return Response(
            {
                "application": str(application.public_id),
                "status": application.status,
                "user": identity(user),
                "csrfToken": get_token(request),
            },
            status=201,
        )


# Expose the caregiver directory scoped before filtering or object lookup.
class CaregiverViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PersonSerializer
    lookup_field = "public_id"
    filterset_fields = ["branch__state_code"]
    queryset = Caregiver.objects.none()

    # Apply ownership/administrator scope before loading caregiver branch data.
    def get_queryset(self):
        return (
            scope_people(Caregiver.objects.all(), self.request.user)
            .select_related("branch")
            .order_by("name", "public_id")
        )


# Reuse directory HTTP behavior with the client model and representation.
class ClientViewSet(CaregiverViewSet):
    serializer_class = ClientSerializer
    queryset = Client.objects.none()

    # Apply ownership and branch boundaries to client directory queries.
    def get_queryset(self):
        return (
            scope_people(Client.objects.all(), self.request.user)
            .select_related("branch")
            .order_by("name", "public_id")
        )


# Expose scoped application reads, review actions and authorized packet downloads.
class ApplicationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ApplicationSerializer
    lookup_field = "public_id"
    filterset_fields = ["branch__state_code", "status"]
    queryset = CaregiverApplication.objects.none()

    # Validate the transition and delegate state/history/audit writes to the service.
    @action(detail=True, methods=["post"], permission_classes=[IsBusinessAdmin], serializer_class=TransitionInput)
    @extend_schema(request=TransitionInput, responses=ApplicationDetailSerializer)
    def transitions(self, request, public_id=None):
        from ..serializers.reviews import TransitionInput
        from ..services.transitions import transition_application
        data = TransitionInput(data=request.data)
        data.is_valid(raise_exception=True)
        application = transition_application(request.user, public_id, data.validated_data)
        return Response(ApplicationDetailSerializer(application).data)

    # Authorize the application before opening its version-bound private packet.
    @action(detail=True, methods=["get"])
    def packet(self, request, public_id=None):
        from rest_framework.exceptions import NotFound
        from ..services.private_files import attachment
        application = self.get_object()
        if not application.form_version.packet_file_id:
            raise NotFound("Demo packet unavailable for this legacy form version.")
        return attachment(application.form_version.packet_file)

    # Include historical form/review details for individual reads.
    def get_serializer_class(self):
        return ApplicationDetailSerializer if self.action == "retrieve" else ApplicationSerializer

    # Scope applications before loading their branch and chronological review history.
    def get_queryset(self):
        user = self.request.user
        return (
            CaregiverApplication.objects.filter(branch__active=True)
            .filter(
                Q(branch__in=admin_branches(user)) | Q(caregiver__user=user, caregiver__active=True)
            )
            .select_related("branch", "caregiver", "form_version")
            .prefetch_related(Prefetch("applicationreview_set", queryset=ApplicationReview.objects.order_by("reviewed_at", "public_id")))
            .order_by("-submitted_at", "public_id")
        )
