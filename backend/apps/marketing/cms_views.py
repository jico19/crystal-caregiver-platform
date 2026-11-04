from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import APIException, NotFound
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.compliance.audit import record_audit_log
from apps.core.models import State
from apps.core.permissions import IsSuperAdmin
from .cms_serializers import SaveDraftSerializer, PublishSerializer
from .models import WebsiteContent
from .publishing import DRAFT_SECTION, PUBLIC_STATES, draft_for, editor_payload, publish_draft, revision_for, store_draft_pdf


def resolve_state(value, *, lock=False):
    slug = value.lower()
    if slug not in PUBLIC_STATES:
        raise NotFound("Choose Florida, Indiana, or Georgia.")
    queryset = State.objects.select_for_update() if lock else State.objects.all()
    return get_object_or_404(queryset, code=PUBLIC_STATES[slug]["code"]), slug


class WebsiteDraftView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, state):
        state_obj, slug = resolve_state(state)
        return Response(editor_payload(state_obj, slug))

    @transaction.atomic
    def put(self, request, state):
        serializer = SaveDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        state_obj, slug = resolve_state(state, lock=True)
        current, saved = draft_for(state_obj)
        if serializer.validated_data["revision"] != revision_for(current):
            return Response({"detail": "This draft changed in another session. Reload before saving."}, status=409)
        draft = dict(serializer.data["draft"])
        if saved is None:
            saved = WebsiteContent(state=state_obj, section_key=DRAFT_SECTION)
        saved.title = draft["overview"]["title"]
        saved.content = draft["overview"]["description"]
        saved.metadata = {"schema_version": 1, "draft": draft}
        saved.save()
        record_audit_log(action="SAVE_WEBSITE_DRAFT", table_name="website_content", record_id=saved.pk,
                         request=request, entity_state=state_obj)
        return Response(editor_payload(state_obj, slug))


class WebsitePublishView(APIView):
    permission_classes = [IsSuperAdmin]

    @transaction.atomic
    def post(self, request, state):
        serializer = PublishSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        state_obj, slug = resolve_state(state, lock=True)
        draft, saved = draft_for(state_obj)
        if saved is None:
            return Response({"detail": "Save and review a draft before publishing."}, status=400)
        if serializer.validated_data["revision"] != revision_for(draft):
            return Response({"detail": "This draft changed. Reload and review it before publishing."}, status=409)
        try:
            snapshot = publish_draft(slug, draft)
        except OSError as error:
            exception = APIException("Publishing could not finish. Your last published page remains available.")
            exception.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
            raise exception from error
        record_audit_log(action="PUBLISH_WEBSITE", table_name="website_content", record_id=saved.pk,
                         request=request, entity_state=state_obj,
                         new_values={"revision": snapshot["revision"], "published_at": snapshot["published_at"]})
        return Response(editor_payload(state_obj, slug))


class WebsiteAssetUploadView(APIView):
    permission_classes = [IsSuperAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get("file")
        if upload is None:
            return Response({"file": ["Choose a public PDF to upload."]}, status=400)
        try:
            asset = store_draft_pdf(upload)
        except OSError as error:
            exception = APIException("The public PDF could not be saved. Please try again.")
            exception.status_code = 503
            raise exception from error
        record_audit_log(action="UPLOAD_PUBLIC_WEBSITE_FILE", table_name="website_content", record_id=asset["asset_key"], request=request)
        return Response(asset, status=201)
