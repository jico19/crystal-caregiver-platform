from django.urls import path
from .views import (
    StateListView,
    StateDetailView,
    StateServicesView,
    StateFormsView,
    StateLicensingView,
    StateCareersView,
    StateContactView,
)

urlpatterns = [
    path("", StateListView.as_view(), name="state_list"),
    path("<str:state>/", StateDetailView.as_view(), name="state_detail"),
    path("<str:state>/services/", StateServicesView.as_view(), name="state_services"),
    path("<str:state>/forms/", StateFormsView.as_view(), name="state_forms"),
    path("<str:state>/licensing/", StateLicensingView.as_view(), name="state_licensing"),
    path("<str:state>/careers/", StateCareersView.as_view(), name="state_careers"),
    path("<str:state>/contact/", StateContactView.as_view(), name="state_contact"),
    path("<str:state>/contact", StateContactView.as_view(), name="state_contact_no_slash"),
]
