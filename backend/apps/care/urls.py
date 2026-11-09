from django.urls import path
from .views import (
    AdminClientCarePlanView,
    AdminClientScheduleCreateView,
    AdminClientScheduleDeleteView,
    AdminClientAssignmentView,
)

urlpatterns = [
    path("clients/<uuid:client_id>/care-plan", AdminClientCarePlanView.as_view(), name="admin_client_care_plan"),
    path("clients/<uuid:client_id>/care-plan/", AdminClientCarePlanView.as_view()),
    path("clients/<uuid:client_id>/schedule", AdminClientScheduleCreateView.as_view(), name="admin_client_schedule_create"),
    path("clients/<uuid:client_id>/schedule/", AdminClientScheduleCreateView.as_view()),
    path("clients/<uuid:client_id>/schedule/<uuid:schedule_id>", AdminClientScheduleDeleteView.as_view(), name="admin_client_schedule_delete"),
    path("clients/<uuid:client_id>/schedule/<uuid:schedule_id>/", AdminClientScheduleDeleteView.as_view()),
    path("clients/<uuid:client_id>/assignments", AdminClientAssignmentView.as_view(), name="admin_client_assignments"),
    path("clients/<uuid:client_id>/assignments/", AdminClientAssignmentView.as_view()),
    path("clients/<uuid:client_id>/assignments/<uuid:caregiver_id>", AdminClientAssignmentView.as_view(), name="admin_client_assignment_delete"),
    path("clients/<uuid:client_id>/assignments/<uuid:caregiver_id>/", AdminClientAssignmentView.as_view()),
]
