from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from apps.accounts.access import scope_people, admin_branches
from apps.accounts.permissions import IsBusinessAdmin
from .models import Caregiver, Document, DocumentVersion
from .serializers.documents import DocumentSerializer, DocumentVersionSerializer, UploadInput
from .serializers.reviews import ReviewInput, CompletionInput
from .services.documents import upload_document, review_document
from .services.checklist import onboarding_snapshot, complete_onboarding
from .private_files import attachment
from .filters import OnboardingFilter
from .serializers.onboarding import OnboardingOutput


# Restrict caregiver lookups to active owned or administratively accessible records.
def scoped_caregivers(user):
    return scope_people(Caregiver.objects.all(), user).filter(active=True).select_related("branch")


# Restrict documents through authorized caregivers before loading review data.
def scoped_documents(user):
    return Document.objects.filter(caregiver__in=scoped_caregivers(user)).select_related("document_type", "caregiver").prefetch_related("documentversion_set__documentreview_set")


# Expose an authorized caregiver's demo checklist snapshot.
class OnboardingView(generics.GenericAPIView):
    serializer_class = OnboardingOutput

    # Scope the caregiver before delegating readiness calculation to the service.
    def get(self, request, public_id):
        caregiver = get_object_or_404(scoped_caregivers(request.user), public_id=public_id)
        return Response(onboarding_snapshot(caregiver, request.user))


# Expose authorized document lists and owner-only synthetic uploads.
class CaregiverDocuments(generics.GenericAPIView):
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser]

    # Resolve an authorized caregiver before paginating its documents.
    def get(self, request, public_id):
        caregiver = get_object_or_404(scoped_caregivers(request.user), public_id=public_id)
        query = scoped_documents(request.user).filter(caregiver=caregiver).order_by("document_type__code")
        page = self.paginate_queryset(query)
        return self.get_paginated_response(DocumentSerializer(page, many=True).data)

    # Scope and validate multipart input before service-level byte validation and persistence.
    @extend_schema(request=UploadInput, responses={201: DocumentVersionSerializer})
    def post(self, request, public_id):
        # Scope before parsing or validating bytes; service authorizes again under lock.
        get_object_or_404(scoped_caregivers(request.user), public_id=public_id)
        data = UploadInput(data=request.data)
        data.is_valid(raise_exception=True)
        value = upload_document(request.user, public_id, data.validated_data)
        return Response(DocumentVersionSerializer(value).data, status=201)


# Expose one scoped document with its versions and reviews.
class DocumentDetail(generics.RetrieveAPIView):
    serializer_class = DocumentSerializer
    lookup_field = "public_id"

    # Keep guessed document identifiers within the caller's authorized caregiver scope.
    def get_queryset(self):
        return scoped_documents(self.request.user)


# Authorize a version's owner before opening its private attachment bytes.
class VersionDownload(generics.GenericAPIView):
    serializer_class = DocumentVersionSerializer

    # Resolve the version through scoped documents before returning its attachment.
    def get(self, request, public_id):
        version = get_object_or_404(DocumentVersion.objects.filter(document__in=scoped_documents(request.user)).select_related("file"), public_id=public_id)
        return attachment(version.file)


# Expose administrator decisions while keeping review rules in the service.
class VersionReview(generics.GenericAPIView):
    permission_classes = [IsBusinessAdmin]
    serializer_class = ReviewInput

    # Validate the review request and serialize the reviewed version returned by the service.
    @extend_schema(responses={201: DocumentVersionSerializer})
    def post(self, request, public_id):
        data = self.get_serializer(data=request.data)
        data.is_valid(raise_exception=True)
        value = review_document(request.user, public_id, data.validated_data)
        return Response(DocumentVersionSerializer(value).data, status=201)


# Expose administrator completion of the illustrative onboarding milestone.
class CompleteOnboarding(generics.GenericAPIView):
    permission_classes = [IsBusinessAdmin]
    serializer_class = CompletionInput

    # Validate expected status before delegating readiness, evidence and audit writes.
    @extend_schema(responses=OnboardingOutput)
    def post(self, request, public_id):
        data = self.get_serializer(data=request.data)
        data.is_valid(raise_exception=True)
        return Response(complete_onboarding(request.user, public_id, data.validated_data))


# Expose staff checklist snapshots restricted to administered branches.
class OnboardingQueue(generics.GenericAPIView):
    permission_classes = [IsBusinessAdmin]
    serializer_class = OnboardingOutput
    filterset_class = OnboardingFilter

    # Scope active caregivers to administrator memberships before applying queue filters.
    def get_queryset(self):
        return Caregiver.objects.filter(active=True, branch__in=admin_branches(self.request.user)).select_related("branch").order_by("name", "public_id")

    # Aggregate filtered checklist counts, then paginate the matching snapshots.
    def get(self, request):
        query = self.filter_queryset(self.get_queryset())
        values = [onboarding_snapshot(person, request.user) for person in query]
        counts = {key: sum(value["counts"][key] for value in values) for key in ("total", "completed", "missing", "pending", "rejected", "expired", "expiring")}
        page = self.paginate_queryset(values)
        response = self.get_paginated_response(page)
        response.data["counts"] = counts
        return response
