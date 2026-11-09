# Phase 1 technical design

Status: proposed implementation contract, not implemented. Version 1, 2026-11-09.

Demo workflow — pending agency confirmation.

Companions: [requirements and scenarios](phase-1-requirements.md),
[ordered tasks](phase-1-tasks.md). All proposed interfaces below are future work.

## Existing foundation and model changes

Reuse `Caregiver`, `CaregiverApplication`, `ApplicationReview`, `JobSubmission`,
`FormTemplate`, `FormVersion`, `BranchDocumentRequirement`, `DocumentType`,
`Document`, `DocumentVersion`, `StoredFile`, `DocumentReview` and `AuditEvent`
in the existing operations domain. Access is defined by `admin_branches` and
`scope_people`, not the conceptual Membership model in older documentation.
Current job submission already creates accounts/profiles/applications atomically.

Do not create a new domain app or overwrite applied migrations. Before database
implementation load the repository's Postgres authoring guidance. Use additive
migrations, historical migration models and both supported database guard paths.

Add these missing structures:

- `CaregiverOnboardingEvent`: scoped, append-only caregiver/reviewer links,
  previous/new status, occurred timestamp and safe evidence of application and
  effective document-version UUIDs. Use statuses `pending`, `onboarding`, `eligible`
  internally; display eligible as “Demo onboarding complete”. Active employment is
  out of scope. Unique completion event per caregiver; repeated completions fail.
- `BranchOnboardingPolicy`: one per branch, `expiry_lead_days` default 30 with
  nonnegative DB check. Required/tracks-expiration flags reuse existing requirements.
  Configuration is maintained through fixtures/seeds or reviewed operator changes;
  no policy editor/API in Phase 1.
- Unique caregiver/document-type pair for caregiver documents (conditional on a
  caregiver owner), and one DocumentReview per DocumentVersion. Existing subject,
  date, version-number and cross-branch guards remain enforced. Preflight duplicates
  before constraints; report collisions and stop, never delete or merge automatically.
- Enforce application status membership including legacy `draft` and Phase 1
  statuses. Draft remains internal; no draft endpoint. Add append-only and branch
  guards to new history records, matching existing migration conventions.

Checklist rows are derived, not a second mutable checklist table. Current active
branch requirements apply immediately; configuration changes do not rewrite history.
Completion records snapshot the evidence used. Approval of any application for the
same caregiver/branch suffices; rejection of another application does not undo it.

Published form versions are already append-only. Seed a new version for extended
answers and the packet; do not attach packets by updating published legacy forms.
Retain legacy validation for legacy jobs. Include schema/version in job detail so
the UI renders the correct fields. Never persist passwords in submitted answers.
Legacy forms without packets return a readable 404 packet-unavailable response.

## API contract

All paths below are relative to `/api/v1/`. List responses use the existing
`count/next/previous/results` envelope. Keep existing list fields compatible and
extend detail serializers separately. Never expose numeric PKs or storage keys.
Use explicit serializer fields; unknown write fields are rejected.

| Method and path | Input | Result |
| --- | --- | --- |
| GET `jobs/{id}/` | Existing public lookup | Existing fields plus `application_form: {public_id, version_number, field_schema}`; only published job/form data |
| POST `jobs/{id}/apply/` | Existing name/email/password/acknowledgement plus experience and availability for new form versions | Existing 201 application/session response; unchanged auth/session behavior |
| GET `applications/` and `applications/{id}/` | Existing state/status filters | List unchanged; detail adds caregiver UUID, form UUID/version/schema, submitted answers and chronological reviews |
| POST `applications/{id}/transitions/` | `expected_status`, `new_status`, `comment` (max 2,000 characters) | 200 updated detail; admin only |
| GET `applications/{id}/packet/` | No payload | Authorized PDF attachment for exact application form version |
| GET `caregivers/{id}/onboarding/` | No payload | Profile summary, milestone status, readiness, checklist, counts, allowed actions and history |
| GET `caregivers/{id}/documents/` | No payload | Paginated documents including category, version summaries and effective-version UUID |
| POST `caregivers/{id}/documents/` | Multipart `document_type` code, `fixture_id`, `file`, `demo_acknowledged`, optional ISO `issued_on`/`expires_on` | 201 new version UUID/number/status; owner only |
| GET `documents/{id}/` | No payload | Scoped detail and chronological versions/reviews |
| GET `document-versions/{id}/download/` | No payload | Authorized attachment; no direct StoredFile route |
| POST `document-versions/{id}/reviews/` | `expected_status="pending"`, `decision`, `comment` max 2,000 | 201 decision summary; admin only |
| POST `caregivers/{id}/onboarding/complete/` | `expected_status="onboarding"` | 200 onboarding result; admin only |
| GET `staff/onboarding/` | State/status filters | Paginated caregiver summaries and counts scoped before aggregation; administrators only |

Example extended submission (password omitted for an authenticated applicant):

```json
{"name":"Synthetic Applicant","email":"applicant@demo.example","experience":"none","availability":["weekdays","daytime"],"demo_acknowledged":true}
```

Example transition and review inputs:

```json
{"expected_status":"under_review","new_status":"rejected","comment":"Synthetic demo review reason"}
```

```json
{"expected_status":"pending","decision":"approved","comment":""}
```

An onboarding response includes `caregiver`, `state_code`, `status`,
`ready_to_complete`, `application_approved`, `requirements`, `counts`, `history`
and `allowed_actions`. A requirement contains `document_type`, `required`,
`tracks_expiration`, `latest_version`, `effective_version`, `state`, `expires_on`.
Counts include required total/completed/missing/pending/rejected/expired/expiring.
Expiring is a subset of completed; optional categories do not affect these counts.

Use existing `error: {code, details}` responses. Return 400 for field validation,
403 for anonymous/CSRF/management-role denial, 404 for out-of-scope objects,
409 with `code="conflict"` for stale/duplicate/invalid transitions and unmet
completion prerequisites, 413 for oversized bytes and 415 for unsupported media.
Completion conflict details may name missing category codes but no other subjects.
Download authorization runs before opening storage or checking file existence.

## Authorization, services and files

| Actor | Own reads/downloads | Own fixture uploads | Management actions |
| --- | --- | --- | --- |
| Anonymous or inactive user | No | No | No |
| Active caregiver | Yes, active owned caregiver branch | Yes | No |
| Client-only user / ordinary staff | No | No | No |
| State administrator | Assigned active branch records | No, unless also the owner | Assigned branch only |
| Agency administrator | Assigned agency's active branches | No, unless also the owner | Assigned agency only |
| Unassigned Django staff/superuser | No | No | No |

Assignments are additive for users with multiple business roles. Scope parent
objects first, then child queries, filters and aggregation. Client-side navigation
cannot select a private branch. Every unsafe action uses existing CSRF handling.

Domain services authorize again inside transactions. Lock caregiver first, then
application or logical document/version consistently. Compare expected status;
only pending reviews may change. Lock caregiver for document creation/version
allocation and completion so concurrent decisions cannot race prerequisite checks.
Every successful status mutation writes history plus an appropriate resource-type
AuditEvent in the same transaction. New application submission also writes its
initial ApplicationReview (`draft` → `submitted`); do not fabricate missing legacy
history. Completion records exact evidence. Audit metadata contains only safe UUIDs,
status codes and action names, never comments/answers/files.

Provide a bundled fixture manifest containing fixture ID, category, extension,
media type, byte size and SHA-256. Frontend uses bundled fixture bytes; backend
compares uploaded bytes to its trusted manifest. No fixture download URL needs
private data. Whitelist checking prevents uploading real documents via a crafted
request. Each format must have at least one valid fixture and negative fixtures
are test-only. Store accepted bytes outside any served directory, under random
UUID keys; sanitize attachment filenames and set `nosniff` and `private, no-store`.
Tracked fixture files contain only “SYNTHETIC DEMO” placeholders, never realistic
identity cards, account details or signatures.

Write validated bytes to a new random private file within the service operation;
on transaction failure remove newly written bytes. Downloads require a committed
StoredFile linked through an authorized document version or packet. A crash may
leave an unreferenced private file: document an explicit dry-run cleanup procedure
for unreferenced files older than 24 hours; never delete referenced versions.
Request bodies, multipart data and review text must not enter application logging.

## Derived checklist and UI

For each active category, select highest-numbered approved version as effective.
Do not fall back to an older approval when the effective version expires. With
no approved version, classify by latest version as pending/rejected or missing.
With an effective version, classify expired/expiring/valid using stored dates.
Keep latest replacement review status separately visible. Tracked categories
require expires_on; optional issued_on must not exceed expires_on. Untracked
categories reject supplied dates. Already expired uploads are permitted for demo
review, but cannot satisfy completion. For 0 required categories show 0/0, no
percentage. Use local date in Django's configured application timezone.

Extend existing caregiver and administrator portals with application details,
review controls, packet links, fixture selector, version history and onboarding
summary. Carry caregiver UUID explicitly for users owning multiple branch records.
Use feature-local components/hooks/types/schemas, one component per file and
150-line limit. Reuse shared Axios/TanStack Query and React Hook Form/Zod. Key all
private queries by caregiver/application UUID and filters; invalidate related
details, queues and counts after writes. Clear private cache on logout as today.
Preserve current styling. Render disabled actions with unmet prerequisites, field
errors beside controls and conflict recovery through refresh. No policy editor,
real file picker, profile mutation, bulk review or real document preview.
