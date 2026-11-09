from django.contrib.auth import login
from drf_spectacular.utils import extend_schema
from apps.accounts.contracts import ApplicationOutput
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
from .models import JobPosting, Caregiver, Client, CaregiverApplication, ApplicationReview
from .review_inputs import TransitionInput
from .services import apply_to_job
from .application_serializers import ApplicationInput, ApplicationSerializer, ApplicationDetailSerializer
from .job_serializers import JobSerializer, JobDetailSerializer
from .person_serializers import PersonSerializer, ClientSerializer


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


class JobViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = JobSerializer
    lookup_field = "public_id"
    filterset_fields = ["branch__state_code"]
    queryset = published_jobs()

    def get_serializer_class(self):
        return JobDetailSerializer if self.action == "retrieve" else JobSerializer


class ApplyView(PublicAuthView):
    serializer_class = ApplicationInput

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


class CaregiverViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PersonSerializer
    lookup_field = "public_id"
    filterset_fields = ["branch__state_code"]
    queryset = Caregiver.objects.none()

    def get_queryset(self):
        return (
            scope_people(Caregiver.objects.all(), self.request.user)
            .select_related("branch")
            .order_by("name", "public_id")
        )


class ClientViewSet(CaregiverViewSet):
    serializer_class = ClientSerializer
    queryset = Client.objects.none()

    def get_queryset(self):
        return (
            scope_people(Client.objects.all(), self.request.user)
            .select_related("branch")
            .order_by("name", "public_id")
        )


class ApplicationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ApplicationSerializer
    lookup_field = "public_id"
    filterset_fields = ["branch__state_code", "status"]
    queryset = CaregiverApplication.objects.none()

    @action(detail=True, methods=["post"], permission_classes=[IsBusinessAdmin], serializer_class=TransitionInput)
    @extend_schema(request=TransitionInput, responses=ApplicationDetailSerializer)
    def transitions(self, request, public_id=None):
        from .review_inputs import TransitionInput
        from .services.transitions import transition_application
        data = TransitionInput(data=request.data)
        data.is_valid(raise_exception=True)
        application = transition_application(request.user, public_id, data.validated_data)
        return Response(ApplicationDetailSerializer(application).data)

    @action(detail=True, methods=["get"])
    def packet(self, request, public_id=None):
        from rest_framework.exceptions import NotFound
        from .private_files import attachment
        application = self.get_object()
        if not application.form_version.packet_file_id:
            raise NotFound("Demo packet unavailable for this legacy form version.")
        return attachment(application.form_version.packet_file)

    def get_serializer_class(self):
        return ApplicationDetailSerializer if self.action == "retrieve" else ApplicationSerializer

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
