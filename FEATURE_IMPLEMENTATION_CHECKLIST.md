# Feature Implementation Checklist

Based on [Scope of work.md](Scope%20of%20work.md) and [AGENTS.md](AGENTS.md).
The Scope of Work defines product requirements; AGENTS.md guides implementation
and prototype delivery. Neither a working demo nor a checked technical task
means agency approval, production readiness, or full client acceptance.

## How to use this checklist

- `[x]` means the specific technical task has verification evidence; `[ ]` means
  incomplete or unverified. Check individual tasks, not entire phases by inference.
- Build each feature as a vertical slice: persistence and permissions, API, UI,
  then focused tests and a demonstrable user flow.
- Use synthetic data only. Label provisional behavior **Demo workflow — pending
  agency confirmation**. Do not invent official forms, clinical instructions,
  mandatory credentials, approval rules, quiz scores, or reminder schedules.
- Keep technical delivery, agency confirmation, and deployment evidence separate.
  Continue independent implementation while policy/content decisions are pending.
- Complete Phase 0 before expanding into later phases. This document lists the
  whole backlog; it does not authorize implementing all phases at once.

## Database schema foundation — implemented separately

Evidence: [schema reference](docs/DATABASE_SCHEMA.md), operations migrations
0001–0003, and 67 passing focused backend tests on a fresh SQLite test database.

- [x] Define 39 domain tables covering Scope of Work sections 1–6, preserving
  the existing user model and keeping person records separate per state.
- [x] Apply local migrations, seed the scope-listed document categories, and
  enforce database ownership, branch, date, uniqueness, and evidence constraints.
- [x] Verify direct-write cross-state rejection, immutable evidence, duplicate
  delivery prevention, training repetition, and owner/subject checks.
- [ ] Run the migrations and focused tests against PostgreSQL before deployment.

This is persistence-layer evidence only. APIs, permissions on actual requests,
workflow services, UI, report queries, and live integrations remain unchecked below.

## Phase 0 — Foundation and access control

Sources: AGENTS.md §§2–6, 9, 11–12; Scope of Work §§1, 6.

### Verified local setup

Evidence: environment setup in this session and [README.md](README.md).

- [x] Install React/Vite dependencies and pinned Django/DRF development dependencies.
- [x] Configure split settings, environment secrets, and local SQLite storage.
- [x] Define the custom user before initial migrations and apply migrations.
- [x] Configure session authentication, authenticated API defaults, and CSRF middleware.
- [x] Connect Vite's `/api` proxy and expose a minimal public health endpoint.
- [x] Document local setup and run commands; ignore local secrets and database paths.
- [x] Verify Django checks, migration consistency, four backend tests, dependency
  consistency, frontend lint/build, and direct/proxied health responses.

These checks establish the development foundation only. The frontend remains a
JavaScript/JSX starter under the approved setup plan. Existing tracked artifacts
remain a repository hygiene concern; ignore rules do not untrack them.

### Remaining foundation

- [ ] Write prototype scope and open-decision records, preserving the Scope of Work.
- [ ] Document current API/data contracts and reconcile absent or stale references
  against code rather than restoring historical architecture automatically.
- [ ] Record the frontend language/convention discrepancy: AGENTS.md requests
  TypeScript, while the approved setup preserves JavaScript. Resolve before a migration.
- [ ] Add feature-based frontend routing, shared Axios/CSRF handling, TanStack Query,
  and suitable form validation; retain the existing Oxlint and Vitest conventions.
- [ ] Add agency, FL/IN/GA branches, role/membership permissions, and explicit
  ownership/state scoping. Confirm cross-branch policy before granting access.
- [ ] Implement CSRF bootstrap, session login/logout/current-user, and password reset.
- [ ] Add caregiver/client registration or invitation; restrict staff provisioning
  to authorized administrators and prevent public role escalation.
- [ ] Add protected caregiver/client/staff shells and safe session-expiry behavior.
- [ ] Seed synthetic branch/role accounts without hardcoded shared credentials
  or resetting existing users' passwords.
- [ ] Standardize API validation/errors, pagination, filtering, throttling, and
  OpenAPI documentation; use explicit serializer fields and scoped querysets.
- [ ] Prove anonymous denial, ownership isolation, state isolation, forged-role
  denial, and CSRF enforcement through the actual authentication/API flows.

Acceptance: distinct synthetic accounts can sign in and see only authorized
records; a branch selector never grants access to another branch.

### Role-based access control (RBAC)

The schema supports role assignments; enforcement on real API requests and
portal routes remains to be implemented. The five portal roles are:

| Role | Intended access |
| --- | --- |
| Super-admin | Manage authorized agency records across FL/IN/GA through explicit AgencyAdmin access. |
| State-admin | Manage records in the assigned state only; no state switcher or cross-state access. |
| Client | Access only their own linked client records, documents, and portal features. |
| Caregiver | Access only their own linked caregiver records, documents, and portal features. |
| Visitor | Browse published public content and submit explicitly public forms; no private record access or account required. |

- [ ] Implement reusable backend permissions for these five roles, combining
  role, active assignment, agency/state scope, and record ownership; deny access
  by default and do not use Django's `is_staff` as business authorization.
- [ ] Enforce one active state assignment for each state-admin. A caregiver/client
  login may link to separate state-specific records; access to one never grants
  access to another person's records or shares documents between states.
- [ ] Allow super-admin cross-state access within the authorized agency while
  preserving record ownership, branch consistency, audit history, and other
  safeguards. Cross-state access does not bypass database integrity constraints.
- [ ] Restrict privileged role assignment and account linking to authorized
  administrators; reject forged role, owner, agency, and state values.
- [ ] Define the current schema's additional `staff` role permissions explicitly
  before exposing it; do not silently grant it state-admin privileges.
- [ ] Apply permissions to list/detail/create/update/delete/custom actions,
  reports/aggregates, and file retrieval as each feature is introduced.
- [ ] Add shared frontend role helpers, protected routes, and appropriate portal
  navigation; backend checks remain authoritative. Public state switching must
  never alter authenticated access rights.
- [ ] Test super-admin cross-state access, state-admin cross-state denial,
  client/caregiver ownership isolation, visitor public access/private denial,
  inactive assignments, role escalation attempts, and forged state selectors.

## Phase 0 — Public website integration

Sources: Scope of Work §1; AGENTS.md §§7, 11.

- [ ] Build a unified public home page and FL/IN/GA landing pages with state switching.
- [ ] Display state-specific services, forms, licensing information, and contact
  details; keep unconfirmed content explicit and editable by authorized staff.
- [ ] Link to caregiver applications and client inquiry/intake entry points.
- [ ] Persist public inquiries with branch/source attribution for staff review
  and the website inquiry report; show submission confirmation and errors.
- [ ] Verify mobile layouts, accessible navigation/forms, and correct state context.

## Phase 1 — Caregiver application and document management

Sources: Scope of Work §§2, 4, 6; AGENTS.md §§7–8, 11–12.

- [ ] Submit a mobile-friendly application, persist it, and show application status.
- [ ] Provide the agency-approved employment packet download; show an explicit
  unavailable state until official content is supplied.
- [ ] View/edit the caregiver's own profile and pending onboarding requirements.
- [ ] Configure required/optional document categories by state without making every
  listed category mandatory. Support Driver's License, CPR, CNA/HHA, TB Test,
  Physical Exam, Background Check, Social Security Card, Auto Insurance,
  Driver's Insurance, Direct Deposit Form, and other onboarding documents.
- [ ] Implement private synthetic-document upload, authorized preview/download,
  metadata, expiration dates, validation, upload feedback, and replacement history.
- [ ] Let authorized staff review documents and approve/reject applications with
  feedback, timestamps, permitted transitions, and audit history.
- [ ] Show uploaded documents, onboarding status, missing/pending/approved documents,
  expired documents, documents expiring soon, and company announcements.
- [ ] Keep expiration calculations separate from document review history.
- [ ] Connect employment signatures to the shared signature flow below.
- [ ] Demonstrate application → upload → staff review → updated dashboard; test
  wrong-caregiver and wrong-state access, invalid uploads, and denied transitions.

## Phase 2 — Client intake, documents, and authorizations

Sources: Scope of Work §§3–4, 6; AGENTS.md §§7–8, 11–12.

- [ ] Persist mobile-friendly intake/referral submissions and display review status.
- [ ] Provide the agency-approved admission packet and forms, with explicit
  unavailable states for missing content.
- [ ] Support private uploads for Insurance Cards, Medicaid Documents, Physician
  Orders, Plan of Care, Identification, Authorizations, and other required documents.
- [ ] Let authorized staff review referrals, approve admissions, record feedback,
  track missing documents, and monitor service start dates with history.
- [ ] Let clients upload new authorizations and view active authorizations,
  current status, valid dates, expiration, and authorization history.
- [ ] Provide client views of care plan, service schedule, forms, documents,
  authorization status, and agency notifications. Use labeled fictional care
  plans/schedules until agency content and ownership are confirmed.
- [ ] Connect admission/form signatures to the shared signature flow below.
- [ ] Connect authorization approval notifications and expiration reminders to
  the outbox and later approved delivery providers.
- [ ] Demonstrate intake → staff review → authorization upload/status/history;
  prove client-to-client, staff-state, and document isolation.

## Phase 3 — In-service training

Sources: Scope of Work §§2, 4–5; AGENTS.md §§7–8, 11–12.

- [ ] Create/manage courses and assign required training within authorized branches.
- [ ] Allow access to assigned online courses and persist course progress/completion.
- [ ] Show pending, in-progress, completed, and overdue training in caregiver and
  staff dashboards, using confirmed completion/due-date rules when available.
- [ ] Generate authorized downloadable certificates; label prototype certificates
  as samples and never imply recognized training evidence.
- [ ] Connect overdue training to reminder generation and in-service reporting.
- [ ] Verify ownership, branch permissions, progress persistence, certificate
  access, and completion rules. Do not add mandatory quizzes or pass scores.

## Phase 3 — Staff dashboards and reports

Sources: Scope of Work §4; AGENTS.md §§7, 9, 11–12.

- [ ] Provide branch-scoped work queues for applications, referrals, credentials,
  training, admissions, missing documents, and authorizations.
- [ ] Provide staff reminder actions and agency-admin-only cross-state summaries.
- [ ] Deliver the caregiver compliance report.
- [ ] Deliver the expiring credential report.
- [ ] Deliver the in-service completion report.
- [ ] Deliver the client authorization report.
- [ ] Deliver the referral source report.
- [ ] Deliver the website inquiry report.
- [ ] Confirm each report's fields, definitions, filters, date boundaries, and
  audience with the agency; label provisional definitions until confirmed.
- [ ] Verify accurate aggregates, pagination, empty states, and state/role isolation
  for all six reports. Report exports are not mandatory scope.

## Phase 3 — Notifications, automation, and signatures

Sources: Scope of Work §§2–3, 5–6; AGENTS.md §§6–10.

### Prototype behavior

- [ ] Add a persistent notification outbox, safe templates, recipients, status,
  delivery-attempt records, and swappable email/SMS adapters.
- [ ] Generate credential-expiration, authorization-expiration, overdue-training,
  new-referral, upload-confirmation, and authorization-approval notifications.
- [ ] Support a staff-only manual reminder trigger or management command; use
  console/test email and recorded fake SMS with visibly simulated delivery.
- [ ] Make generation/retries idempotent and verify timezone/date boundaries and
  duplicate prevention. Reminder windows remain configurable demo assumptions.
- [ ] Demonstrate electronic signatures for caregiver/client documents with
  consent text, signer attribution, timestamp, document version, and audit record.
- [ ] Verify signature ownership, authorization, document-version association,
  and rejection of unauthorized signing; make no legal-validity claim for demos.

### Required delivery after agency/provider confirmation

- [ ] Confirm email/SMS providers, recipients, templates, consent requirements,
  timing, retry behavior, and operational ownership.
- [ ] Configure approved email/SMS transports and automatic execution; verify
  controlled end-to-end delivery with evidence before claiming live notifications.
- [ ] Confirm signature text, document ownership, legal/vendor suitability, and
  any chosen provider; verify the approved signature workflow separately.

Email/SMS and automatic reminders remain required scope. A manual trigger,
simulated outbox, or development sender is interim evidence only.

## Phase 4 — Security, agency review, and deployment

Sources: Scope of Work §6; AGENTS.md §§6, 10–13.

- [ ] Enforce role, ownership, and state permissions on lists, detail views,
  writes, reports, aggregates, files, and custom actions; never rely on UI guards.
- [ ] Protect login and mutations with CSRF; verify secure session cookies,
  password recovery, rate limits, secure headers, and privileged-account MFA.
- [ ] Audit sign-ins, reviews, signatures, changes, file access, and relevant
  authorization failures; protect audit history and redact sensitive logs.
- [ ] Verify private storage, file types/content/size validation, unguessable
  storage keys, authorized retrieval, and the malware-scanning approach.
- [ ] Review HTTPS, exact hosts/origins, production settings, PostgreSQL, durable
  private media storage, secret management, and `manage.py check --deploy`.
- [ ] Confirm hosting suitability, domains, budget, operations/support ownership,
  backups/restore evidence, incident response, and approved retention policies.
- [ ] Complete privacy/security/compliance and vendor/BAA assessments where
  applicable before real sensitive data; do not claim HIPAA compliance from tests.
- [ ] Obtain agency confirmation of legal/state structure, branch access,
  official packets/fields/signatures, mandatory documents, approval meanings,
  training rules, authorization handling, and care-plan/schedule ownership.
- [ ] Demonstrate each implemented flow with synthetic data and obtain separate
  client workflow confirmation and acceptance records.

## Optional and excluded work

- [ ] **Optional, deferred:** secure agency messaging; implement only if selected.
- Do not add public caregiver search, ratings, direct family hiring, memberships,
  billing/HCPCS calculations, automatic staffing gates, report exports, or new
  external integrations as mandatory requirements.
- Do not introduce a workflow engine, Redis, or background queue merely to match
  a suggested architecture; add infrastructure only for demonstrated needs.

## Evidence required for every feature handoff

- [ ] Record the Scope of Work section, delivered behavior, and provisional assumptions.
- [ ] Record tests/commands, results, and a real browser demonstration where relevant;
  include loading, empty, validation, failure, and permission-denied states.
- [ ] Use pytest/pytest-django for backend tests and Vitest with React Testing
  Library for frontend behavior; add at least one core browser integration flow.
- [ ] Record pending agency decisions with owner/status and deployment dependencies.
- [ ] Record technical readiness, agency workflow confirmation, and client acceptance
  independently; do not close tasks with unresolved security-sensitive failures.
