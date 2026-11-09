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


def scoped_caregivers(user):
    return scope_people(Caregiver.objects.all(), user).filter(active=True).select_related("branch")


def scoped_documents(user):
    return Document.objects.filter(caregiver__in=scoped_caregivers(user)).select_related("document_type", "caregiver").prefetch_related("documentversion_set__documentreview_set")


class OnboardingView(generics.GenericAPIView):
    serializer_class = OnboardingOutput

    def get(self, request, public_id):
        caregiver = get_object_or_404(scoped_caregivers(request.user), public_id=public_id)
        return Response(onboarding_snapshot(caregiver, request.user))


class CaregiverDocuments(generics.GenericAPIView):
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, public_id):
        caregiver = get_object_or_404(scoped_caregivers(request.user), public_id=public_id)
        query = scoped_documents(request.user).filter(caregiver=caregiver).order_by("document_type__code")
        page = self.paginate_queryset(query)
        return self.get_paginated_response(DocumentSerializer(page, many=True).data)

    @extend_schema(request=UploadInput, responses={201: DocumentVersionSerializer})
    def post(self, request, public_id):
        # Scope before parsing or validating bytes; service authorizes again under lock.
        get_object_or_404(scoped_caregivers(request.user), public_id=public_id)
        data = UploadInput(data=request.data)
        data.is_valid(raise_exception=True)
        value = upload_document(request.user, public_id, data.validated_data)
        return Response(DocumentVersionSerializer(value).data, status=201)


class DocumentDetail(generics.RetrieveAPIView):
    serializer_class = DocumentSerializer
    lookup_field = "public_id"

    def get_queryset(self):
        return scoped_documents(self.request.user)


class VersionDownload(generics.GenericAPIView):
    serializer_class = DocumentVersionSerializer

    def get(self, request, public_id):
        version = get_object_or_404(DocumentVersion.objects.filter(document__in=scoped_documents(request.user)).select_related("file"), public_id=public_id)
        return attachment(version.file)


class VersionReview(generics.GenericAPIView):
    permission_classes = [IsBusinessAdmin]
    serializer_class = ReviewInput

    @extend_schema(responses={201: DocumentVersionSerializer})
    def post(self, request, public_id):
        data = self.get_serializer(data=request.data)
        data.is_valid(raise_exception=True)
        value = review_document(request.user, public_id, data.validated_data)
        return Response(DocumentVersionSerializer(value).data, status=201)


class CompleteOnboarding(generics.GenericAPIView):
    permission_classes = [IsBusinessAdmin]
    serializer_class = CompletionInput

    @extend_schema(responses=OnboardingOutput)
    def post(self, request, public_id):
        data = self.get_serializer(data=request.data)
        data.is_valid(raise_exception=True)
        return Response(complete_onboarding(request.user, public_id, data.validated_data))


class OnboardingQueue(generics.GenericAPIView):
    permission_classes = [IsBusinessAdmin]
    serializer_class = OnboardingOutput
    filterset_class = OnboardingFilter

    def get_queryset(self):
        return Caregiver.objects.filter(active=True, branch__in=admin_branches(self.request.user)).select_related("branch").order_by("name", "public_id")

    def get(self, request):
        query = self.filter_queryset(self.get_queryset())
        values = [onboarding_snapshot(person, request.user) for person in query]
        counts = {key: sum(value["counts"][key] for value in values) for key in ("total", "completed", "missing", "pending", "rejected", "expired", "expiring")}
        page = self.paginate_queryset(values)
        response = self.get_paginated_response(page)
        response.data["counts"] = counts
        return response
