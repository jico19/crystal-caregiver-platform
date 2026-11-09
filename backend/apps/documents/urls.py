from django.urls import path
from .views import (
    DocumentTypesListView,
    DocumentUploadIntentView,
    DocumentDownloadUrlView,
    DocumentFileUploadView,
    DocumentDirectFileView,
    DocumentMeListView,
    AdminDocumentListView,
    AdminDocumentReviewView,
    AdminDocumentRequirementsView,
)

urlpatterns = [
    path("types", DocumentTypesListView.as_view(), name="document_types"),
    path("upload-intent", DocumentUploadIntentView.as_view(), name="document_upload_intent"),
    path("me", DocumentMeListView.as_view(), name="document_me"),
    path("<uuid:id>/upload-file/", DocumentFileUploadView.as_view(), name="document_upload_file"),
    path("<uuid:id>/upload-file", DocumentFileUploadView.as_view(), name="document_upload_file_no_slash"),
    path("<uuid:id>/file/", DocumentDirectFileView.as_view(), name="document_direct_file"),
    path("<uuid:id>/file", DocumentDirectFileView.as_view(), name="document_direct_file_no_slash"),
    path("<uuid:id>/download-url", DocumentDownloadUrlView.as_view(), name="document_download_url"),
]
