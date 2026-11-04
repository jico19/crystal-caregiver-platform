from django.urls import path
from .views import (
    AdminAuthorizationListCreateView,
    AdminAuthorizationDetailView,
    AdminAuthorizationReviewView,
)

urlpatterns = [
    path("", AdminAuthorizationListCreateView.as_view(), name="admin_authorizations"),
    path("<uuid:id>", AdminAuthorizationDetailView.as_view(), name="admin_authorization_detail"),
    path("<uuid:id>/review", AdminAuthorizationReviewView.as_view(), name="admin_authorization_review"),
]
