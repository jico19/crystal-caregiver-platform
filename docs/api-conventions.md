# API conventions
Base `/api/v1/`. Paginated JSON, predictable errors via a custom exception handler, OpenAPI docs.
Endpoints (create as slices need them):
auth/{csrf,login,logout,me}, branches, caregiver-applications, caregiver/{me,documents,trainings},
client-intakes, client/{me,authorizations}, staff/applications/{id}/review,
staff/reports/compliance, staff/notifications.
Authorize any supplied branch_id, user_id, or document ID against request.user.
Reports and exports use the same scoping as list views.

## Implemented Phase 1 routes

The exact method/path contract is in specs/phase-1-design.md. Application details
retain original form schema/answers and chronological review history. Transitions
compare expected_status; stale/duplicate/final decisions return 409. Rejections
require a nonblank reason. Unknown write fields are rejected.

Caregiver onboarding, document lists and document details scope the caregiver
before queries. Uploads are owner-only multipart fixture bytes. Packet/version
attachments authorize the parent before opening private storage. Staff onboarding
queues scope active administrator assignments before filters and aggregates.

Uploads return 413 for oversized data and 415 for unsupported media/signatures;
invalid fixture digests/fields return 400. Out-of-scope authenticated lookups return
404, management without an assignment returns 403, and every unsafe session request
requires CSRF. Downloads set private, no-store and nosniff headers. No storage keys
or direct media URLs appear in API responses. The authenticated OpenAPI endpoint
includes the implemented routes.
