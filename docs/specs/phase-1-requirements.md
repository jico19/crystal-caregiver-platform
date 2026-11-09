# Phase 1 requirements: caregiver onboarding and documents

Status: implemented and verified for the SQLite prototype, 2026-11-09.
PostgreSQL-only validation is deferred. See [evidence](../phase-1-evidence.md).

Demo workflow — pending agency confirmation.

Read with [technical design](phase-1-design.md) and [implementation tasks](phase-1-tasks.md).
Source: [Phase 1 checklist](../implementation-checklist.md), [scope](../../Scope%20of%20work.md)
sections 2, 4 and 6, and [recorded decisions](../open-decisions.md).

## Scope and prerequisites

This package specifies synthetic caregiver applications, administrator review,
employment packets, fixture document uploads, checklists and onboarding views.
The implemented prototype does not approve agency policy. Phase 0 must close before
application implementation starts. Owner instruction on 2026-11-09 defers
PostgreSQL validation until migration work; SQLite is used for the prototype.
Remaining foundation work must be verified; see [evidence](../phase-0-evidence.md).

Client workflows, training, reminders, announcements, electronic signatures,
report exports, production storage and external vendors are excluded. No real
PHI, identifiers, bank information, documents or notification calls are permitted.
Do not claim HIPAA compliance, legal signature validity or employment eligibility.

## Functional requirements

| ID | Requirement and acceptance condition |
| --- | --- |
| P1-01 | Each screen and generated file identifies the illustrative demo. Configuration is branch-specific, seeded identically for FL/IN/GA, and never presented as a legal requirement. |
| P1-02 | Extend job application submission with a required synthetic name (1–200 trimmed characters), valid email, required experience enum and nonempty unique availability selections. Retain existing account/password and duplicate-job-submission rules. |
| P1-03 | Experience values are `none`, `under_one_year`, `one_to_three_years`, `over_three_years`. Availability values are `weekdays`, `weekends`, `daytime`, `evenings`. Require `demo_acknowledged=true`. Reject unknown fields and values. No health, government-ID or financial questions. |
| P1-04 | Bind validation and readable answer labels to the job's published FormVersion. Preserve old submissions and their original schema; never edit a published version. Administrators can read scoped application details and review history; owners can read their own. |
| P1-05 | Owners and authorized administrators can download the application's versioned synthetic PDF employment packet. The packet identifies branch and form version and contains no signature fields, identifiers or financial data. Unauthorized downloads disclose no file metadata. |
| P1-06 | Administrators move an application from `submitted` to `under_review`, then to `approved` or `rejected`. Rejection requires a nonblank reason. Rejected and approved applications are terminal in this phase. Every successful transition writes history and audit atomically. |
| P1-07 | Application approval starts caregiver onboarding. An administrator explicitly completes it only when at least one application for that caregiver/branch is approved and all active required documents have an effective approved, unexpired version. Record immutable completion evidence. No automatic completion or work authorization. |
| P1-08 | Each caregiver has a derived checklist showing required and optional categories, latest review state, effective version, expiry and pending requirements. Required means active branch configuration, not a statutory obligation. |
| P1-09 | Preserve all 11 caregiver categories: driver's license, CPR, CNA/HHA, TB test, physical exam, background check, Social Security card, auto insurance, driver's insurance, direct deposit and other onboarding documents. Keep insurance categories separate. Only synthetic license, CPR and CNA/HHA are required and track expiration by default. All others are optional and do not track expiration by default. |
| P1-10 | The UI offers generated fixtures only, with no local file picker. Upload multipart bytes to private storage. The backend accepts only exact bundled fixture contents with matching category and declared type; acknowledgement alone is insufficient. Sensitive-category fixtures are plain labeled placeholders with no realistic identifiers. |
| P1-11 | Allow PDF, PNG and JPEG fixtures, nonempty and at most 5 MiB (5,242,880 bytes). Validate extension, declared type, signature and approved fixture digest server-side. Use random storage keys; return no storage paths or public media URLs. Only authorized attachment downloads expose bytes. |
| P1-12 | Replacements append immutable document versions. Administrators approve or reject pending versions; rejection requires a reason. Record reviewer, decision and timestamp with atomic audit. Owners cannot review their own files unless separately authorized as business administrators; role restrictions derive from assignments. |
| P1-13 | Compute expiration using the application timezone (`UTC` currently). Validity includes the expiry date; expiration begins the following date. Expiring means today through today plus configured lead days, inclusive; default 30. A pending/rejected replacement does not invalidate an earlier effective approved version. |
| P1-14 | Caregiver screens show their branch-specific profile, applications, packet, documents, review reasons, checklist and demo compliance counts. Administrator screens show scoped applications, document review and onboarding/compliance queues with state/status filters. No cross-branch totals or profile editing in Phase 1. |
| P1-15 | Forms, review actions and downloads work at 390, 768, 1024 and 1440px, with keyboard-accessible labels, visible focus, readable errors and loading/empty/failure states. Do not lose entered application answers after a recoverable server error. |
| P1-16 | Scope every private read, mutation, aggregate and download by active user and branch assignment before lookup/filtering. Require valid CSRF for unsafe methods. Reject forged role/owner/user/branch fields. Ordinary staff and Django admin flags alone grant no management access. |
| P1-17 | Rollbacks produce no partial state/history/audit or orphaned files. Concurrency and stale/duplicate actions cannot create duplicate versions, reviews or completion events. Logs/errors/audit metadata exclude answers, file bytes, review text and credentials. |

## Acceptance scenarios

| ID | Scenario and expected result |
| --- | --- |
| A1 | Submit valid extended answers in each state: account/profile/application persist in that job's branch and answers display with original labels. Invalid/empty/forged fields produce field errors without partial writes. Legacy submissions remain readable without new required answers. |
| A2 | Request old and new packet versions as owner/admin: exact versioned PDF downloads. Anonymous, another caregiver, other-branch administrator and unrelated agency administrator cannot retrieve it. |
| A3 | Submit → review → approval/rejection: only allowed transitions succeed. Empty rejection reason, owner/staff review and stale/duplicate transition fail without new history/audit. Forced audit failure rolls the transition back. |
| A4 | Upload fixtures for all categories: versions and checksums persist privately. Wrong category/digest/signature/type, zero bytes, >5 MiB, forged owner and missing CSRF fail without records/files. Exactly 5 MiB still requires a valid configured fixture. |
| A5 | Upload two replacements concurrently: distinct sequential versions, one logical document. Review the same version concurrently: one review wins; stale requests return conflict. Earlier approved bytes and history remain unchanged. |
| A6 | Approve/reject replacements: highest-numbered approved version is effective; pending/rejected versions do not replace it. Once that approved version expires, an older approved version does not restore validity. |
| A7 | Test yesterday/today/lead-window-end/next-day dates with a fixed clock: missing, pending, rejected, expired, expiring and valid counts are deterministic. Optional categories never block completion. Empty required set yields 0/0 and no invented percentage. |
| A8 | Complete onboarding before approval or required reviews: blocked. Complete after prerequisites: history/audit record actor and evidence. Duplicate completion conflicts. Subsequent expiration changes current checklist readiness, preserving the historical milestone. |
| A9 | For every endpoint test anonymous, owner, another caregiver, client-only user, ordinary staff, same-branch admin, wrong-branch admin, agency admin and other-agency admin, including guessed UUIDs and totals. Authenticated out-of-scope objects return 404; management access without assignment returns 403. |
| A10 | Test CSRF, inactive users/branches/assignments, unknown write fields, no secrets/paths/payloads in responses/logging, no external notification/signature calls, failed-file cleanup and audit rollback. |
| A11 | Browser journey at desktop/mobile: synthetic application → admin review → fixture uploads → document review → explicit completion; caregiver sees result and downloads authorized files. Public state changes do not alter private permissions. |
| A12 | Seed twice: preserve accounts/passwords, published forms, existing assignments and configuration edits; create no duplicate requirements/files. PostgreSQL direct-write tests prove constraints and migration upgrade safety. |

## Checklist traceability

Phase 1 checklist items are numbered by their existing order, without changing
their completion status.

| Checklist item | Requirements | Acceptance | Task |
| --- | --- | --- | --- |
| 1 Confirm fields/rules/permissions | P1-01–04, P1-06–09, P1-16 | A1, A3, A9 | T0, T1, T2 |
| 2 Extended application/details | P1-02–04 | A1 | T1 |
| 3 Employment packet | P1-05 | A2 | T3 |
| 4 Application/onboarding transitions | P1-06–07, P1-17 | A3, A8 | T2, T5 |
| 5 Onboarding checklist | P1-08 | A7, A8 | T4, T5 |
| 6 Complete catalog | P1-09 | A4, A12 | T3, T4 |
| 7 Protected uploads/downloads | P1-10–11, P1-16–17 | A4, A5, A9, A10 | T3 |
| 8 Document review/history | P1-12, P1-17 | A5, A6 | T4 |
| 9 Expiry calculations | P1-13 | A6, A7 | T4 |
| 10 Caregiver dashboard | P1-14 | A8, A11 | T5 |
| 11 Staff views (admins only) | P1-14, P1-16 | A9, A11 | T5 |
| 12 Mobile verification | P1-15 | A11 | T1–T5 |
| 13 Negative endpoint tests | P1-16–17 | A9, A10 | T1–T5 |
