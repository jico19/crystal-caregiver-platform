# API conventions
Base `/api/v1/`. Paginated JSON, predictable errors via a custom exception handler, OpenAPI docs.
Endpoints (create as slices need them):
auth/{csrf,login,logout,me}, branches, caregiver-applications, caregiver/{me,documents,trainings},
client-intakes, client/{me,authorizations}, staff/applications/{id}/review,
staff/reports/compliance, staff/notifications.
Authorize any supplied branch_id, user_id, or document ID against request.user.
Reports and exports use the same scoping as list views.