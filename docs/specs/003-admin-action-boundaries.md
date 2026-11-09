# 003: Separate admin action validation and domain services

Status: Complete. Priority: P1. Audit finding: F3. Depends on: none.

## Problem and outcome

`AdminCaregiverApplicationReviewView.post` and `AdminClientAdmissionView.post` in
`backend/apps/admin_portal/views.py` combine request parsing, business rules,
model mutation, and auditing. Admission assigns raw status/date values without
an action serializer. Both actions must use explicit input contracts and domain
services while preserving authorization and valid response behavior.

## Scope and target responsibilities

- Views: existing authentication, object lookup, state authorization, serializer
  invocation, service call, and HTTP response.
- Action serializers: create `backend/apps/admin_portal/serializers.py` for the
  two request contracts, or place each in its existing domain serializer module
  if that avoids circular imports. Choose one clear ownership convention.
- Services: review operation in caregiver services and admission operation in
  client services, with domain mutation and audit orchestration.
- Existing representation serializers remain responsible for response fields.

Keep other admin resources, generic CRUD, schema migrations, and new transition
policies outside this spec. Deliver admission and review as independently
verifiable slices.

## Input contracts

| Action | Field | Required behavior |
|---|---|---|
| Admission | status | Choice from Client.STATUS_CHOICES; omitted defaults to approved. Explicit null/unknown values return 400. |
| Admission | service_start_date | Optional nullable DRF date; omitted clears it as currently implemented; malformed dates return 400. |
| Admission | admission_notes, rejection_reason | Optional strings allowing blank/null to match existing nullable fields; omitted defaults to empty string. |
| Review | status | Required choice: approved, rejected, under_review, onboarding. |
| Review | notes | Optional string allowing blank; omitted defaults to empty string; null returns 400. |
| Review | rejection_reason | Optional nullable string allowing blank; omitted defaults to null. |

New field-specific validation errors may replace ad hoc validation responses.
Preserve valid request success status codes, response fields, and current metadata
updates. Do not add rejection-reason requirements or status-transition restrictions
without a separate product decision.

## Service and audit requirements

- Invalid input and unauthorized actions perform no mutations or audit writes.
- Admission retains admitted_by/admitted_at; review retains reviewed_by/reviewed_at.
- Preserve audit action names and existing sanitized old/new values. Reuse the
  existing whitelist and entity-state attribution.
- Treat the action mutation and its required audit record as one atomic operation.
  `record_audit_log` currently catches failures and returns None: wrapping it in
  a transaction alone does not meet this requirement. These services must detect
  failure and raise so their mutation rolls back. Do not change the audit failure
  policy for unrelated callers.
- Pass actor and minimal audit metadata explicitly where practical. Keep request
  parsing out of domain services; avoid a new generic audit framework.

## Acceptance criteria and validation

- [x] Valid admission/review calls preserve response fields, defaults, metadata,
  state attribution, and expected audit actions.
- [x] Invalid status/date/type input returns 400 and changes no model/audit data.
- [x] Cross-state administrators remain denied; permitted state/global admins
  retain access; missing or deleted targets preserve current lookup behavior.
- [x] Simulated required-audit failure rolls back the domain mutation.
- [x] The two views no longer assign workflow fields from request.data.
- [x] Services own mutation and serializers own input validation.

Extend `backend/apps/admin_portal/tests.py` using
`test_application_review_and_legal_hold_audit_logging` as a structural pattern.
Run `python -m pytest apps/admin_portal/tests.py`, adding client/caregiver test
files only when changes affect their shared services. No whole-suite run is needed.

## Completion record

Completed 2026-11-09. Request contracts live together in
`apps/admin_portal/serializers.py`. Admission and review mutations live in
`apps/clients/services.py` and `apps/caregivers/services.py`, respectively. Views
retain authentication, lookup, state authorization, and the existing response
serializers, passing the actor, IP address, user agent, and request ID explicitly.

Both services use atomic transactions and raise when `record_audit_log` returns
`None`. Audit action names, sanitized old/new values, entity-state attribution,
and the audit helper's failure policy for unrelated callers are preserved. Text
fields reject non-string JSON values and retain whitespace in valid text.

Focused validation passed: all 17 tests in `apps/admin_portal/tests.py`, run from
`backend/` with `venv/Scripts/python.exe -m pytest apps/admin_portal/tests.py`.
The independently runnable admission and review slices are `ClientAdmissionTests`
(7 tests) and `CaregiverApplicationReviewTests` (8 tests); the two existing admin
tests also passed.

Coverage includes all existing accepted statuses without new transition/reason
requirements; omitted, blank, and nullable fields; typed dates; unchanged response
keys and actor/timestamp metadata; exact audit payloads and request metadata;
state/global administrator success; unauthenticated, non-admin, cross-state, and
unassigned-admin denial; and missing/soft-deleted target lookup behavior.
Invalid and unauthorized requests leave model and audit data unchanged.

For each action, rollback was checked both when the audit helper returned `None`
and when a database-backed audit insert violated its NOT NULL constraint. The
latter tests observed the updated domain status before the insert failed, then
confirmed that the entire mutation and audit transaction had rolled back. No
schema changes or new workflow policies were introduced.
