from django.urls import path
from .cms_views import WebsiteDraftView, WebsitePublishView, WebsiteAssetUploadView

urlpatterns = [
    path("assets/", WebsiteAssetUploadView.as_view(), name="website_public_asset"),
    path("<str:state>/", WebsiteDraftView.as_view(), name="website_draft"),
    path("<str:state>/publish/", WebsitePublishView.as_view(), name="website_publish"),
]
