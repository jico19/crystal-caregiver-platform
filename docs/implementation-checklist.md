# Pending scope implementation checklist

Source: [Scope of work](../Scope%20of%20work.md). Baseline reviewed: 2026-11-09.

Demo workflow — pending agency confirmation.

This is a planning checklist, not authorization to implement every phase. Work one
phase at a time. Keep overall phase status in [phases.md](phases.md). An unchecked
item is not complete end to end, even if database models already exist. Check an
item only after its API, screen, permissions and relevant tests pass.

## Existing foundation to preserve

Source inspection found public FL/IN/GA pages and switching, job application and
account creation, session/CSRF authentication, password reset, invitations, scoped
caregiver/client directories, application status reads, portal shells, seed data
and audit infrastructure. These are existing capabilities, not newly verified
acceptance results. Operational workflows below remain pending.

## Phase 0 — reconcile foundation and scope section 1

- [ ] Reconcile Phase 0 checklist against code and test evidence before closing it.
- [ ] Repair missing README document links or create the intended scope,
  architecture, security checklist and schema documents from current code.
- [ ] Reconcile documented commands, runtime pins and actual tooling. Record
  missing commands as TODOs; ask before dependency or formatter/lint changes.
- [ ] Validate existing PostgreSQL migrations and integrity constraints.
- [x] Record agency decisions on branch boundaries and staff permissions in
  [open-decisions.md](open-decisions.md); keep unapproved staff access disabled.
- [ ] Provide configurable state-specific services, forms, licensing and contact
  content. Use illustrative content until agency approval; verify FL/IN/GA switching
  preserves the selected state's content and application context.

### Reconciliation status — 2026-11-09

Phase 0 remains open. See [verification evidence](phase-0-evidence.md) for the
commands inspected, results and outstanding decisions.

- [x] Confirm Oxfmt/Oxlint as the intended frontend tools and update AGENTS.md.
- [x] Inspect runtime pins: Python 3.14.4 matches `.python-version`; Node 24.15.0
  matches the major version in `frontend/.nvmrc`.
- [x] Record the owner's decision to retain current demo branch boundaries and
  leave ordinary staff management access disabled.
- [ ] Finish command reconciliation: confirm pip/npm installation commands,
  correct stale settings module references and remove the stale seed-command TODO.
- [ ] Clear verification blockers: backend Ruff lint reports 438 existing errors;
  frontend format check reports the existing `src/app/App.tsx` edit.
  Backend format check passed (55 files); remaining checks were skipped.
- [ ] Provide a disposable PostgreSQL database and run migration/integrity checks.
  Owner confirmed none is currently available; this gate remains pending.
- [ ] Create the missing README-linked scope, architecture, security checklist
  and schema documents from current code.
- [ ] Implement configurable state content and verify state switching/application
  context. Existing generic copy and state-filtered jobs do not close this item.
- [ ] Complete the remaining acceptance checks before closing Phase 0.

## Phase 1 — caregiver onboarding and documents (scope sections 2, 4, 6)

Specifications: [requirements](specs/phase-1-requirements.md),
[technical design](specs/phase-1-design.md), and
[implementation tasks](specs/phase-1-tasks.md). Specs are prepared; implementation
remains pending and gated on Phase 0 completion.

- [ ] Confirm application fields, onboarding steps, required credentials and
  review permissions per branch; record unresolved rules before implementation.
- [ ] Extend the basic application into the agreed synthetic application form;
  validate required answers and show readable staff application details.
- [ ] Add employment packet download with versioned, synthetic content.
- [ ] Implement application review, approve/reject and onboarding transitions
  using configurable demo rules, atomic history and audit events.
- [ ] Add per-caregiver onboarding checklists with pending/completed requirements.
- [ ] Configure the complete document catalog: driver's license, CPR, CNA/HHA,
  TB test, physical exam, background check, Social Security card, auto insurance,
  driver's insurance, direct deposit form and other onboarding documents.
  Use synthetic placeholders only; confirm overlapping insurance categories.
- [ ] Implement synthetic document upload, versioning and authorized download;
  enforce server-side type/size limits, random private keys and ownership/branch
  permissions. Never expose public media URLs or collect real documents.
- [ ] Add staff document review with approval/rejection reasons and audit/history.
- [ ] Add configurable expiry dates and missing/expiring/expired calculations.
- [ ] Expand caregiver dashboard with profile details, documents, onboarding
  progress, pending requirements and compliance counts.
- [ ] Add staff onboarding/compliance views scoped to authorized branches.
- [ ] Verify the application and document flows on mobile-sized screens.
- [ ] Add negative endpoint tests for anonymous access, another caregiver,
  another branch, forged ownership fields, invalid uploads and missing CSRF.

## Phase 2 — client intake and authorizations (scope sections 3, 4)

- [ ] Confirm intake fields, referral sources, admission decisions, consent
  authority and service-start rules; record configurable demo assumptions.
- [ ] Persist synthetic online inquiries/referrals and client intake submissions.
- [ ] Add versioned synthetic admission packet download and form viewing.
- [ ] Add staff intake/referral review and admission/decline transitions with
  atomic history and audit events.
- [ ] Configure client document categories: insurance cards, Medicaid documents,
  physician orders, plan of care, identification, authorizations and other documents.
- [ ] Reuse protected upload/download/review services for synthetic client files;
  add missing-document tracking and client document viewing.
- [ ] Implement authorization submission/upload, review and active/denied status.
- [ ] Add authorization date validation, active/expiring/expired views and history.
- [ ] Add care-plan summary and service-schedule placeholders to the client portal;
  keep actual care/scheduling rules pending confirmation.
- [ ] Track service-start dates and expose scoped staff authorization/admission views.
- [ ] Show client forms, documents, authorization status and pending requirements.
- [ ] Add client ownership, branch isolation, forged-ID and CSRF tests for every
  new endpoint, including files and authorization history.

## Phase 3 — training, communications and reports (scope sections 2–5)

### Training

- [ ] Confirm course provider, assignment rules, completion criteria and certificate
  rules; keep state-specific requirements configurable and illustrative.
- [ ] Add online course access and assignments with progress, completed and
  overdue states; audit changes and prevent cross-user completion changes.
- [ ] Add synthetic completion certificates and protected certificate downloads.
- [ ] Show required/completed training and progress in the caregiver dashboard.
- [ ] Add branch-scoped administrator completion and overdue monitoring.

### Notifications and electronic signatures

- [ ] Reconcile existing notification models with the documented
  `NotificationOutbox` contract before implementing reminder services.
- [ ] Add demo outbox creation for credential expiry, authorization approval/expiry,
  overdue training, new referrals and document upload confirmations.
- [ ] Make reminder jobs idempotent per subject/event/window; test reruns,
  configurable lead times and timezone boundaries.
- [ ] Add staff manual reminders, caregiver announcements and client agency
  notifications with scoped recipient selection and read visibility.
- [ ] Provide simulated email/SMS delivery status in the outbox. Keep all demo
  and test code free of real external email, SMS and e-signature calls.
- [ ] Define a synthetic signature workflow for employment/admission forms;
  record form version, signer, timestamp and audit history without claiming
  legal validity. Confirm consent and provider choices with the agency.
- [ ] Optional: confirm whether secure client/agency messaging is required before
  planning its permissions, retention and implementation.

### Reports and analytics

- [ ] Caregiver compliance report.
- [ ] Expiring credential report.
- [ ] In-service completion report.
- [ ] Client authorization report.
- [ ] Referral source report, backed by persisted source data.
- [ ] Website inquiry report, backed by persisted inquiry data.
- [ ] Apply membership/branch scoping before report aggregation, filtering and
  any exports; test guessed UUIDs, empty results and cross-branch totals.
- [ ] Add an end-to-end journey covering application, review, synthetic documents,
  client authorization, training and simulated reminders as features become ready.

## Phase 4 — agency review and owner gates (scope section 6)

These are human-owned gates. Track evidence in [owner-gates.md](owner-gates.md);
do not activate vendors or accept real data as part of demo implementation.

- [ ] Obtain approved FL/IN/GA content, forms, workflows and requirement rules.
- [ ] Confirm electronic signature provider, consent and legal review.
- [ ] Confirm email/SMS vendors, delivery requirements and vendor/BAA review.
- [ ] Complete HIPAA applicability and production readiness assessments without
  representing the prototype as compliant or approved.
- [ ] Complete staff/admin MFA, malware scanning, private durable object storage,
  encrypted backups and restore drills through owner-approved work.
- [ ] Verify production HTTPS/SSL and secure session configuration before launch.
- [ ] Approve retention/deletion, incident response, access reviews and activity
  monitoring; confirm hosting, operations ownership and availability/cost review.

## Acceptance gate for every implementation slice

- [ ] Deliver model/integrity constraints → service → API → React screen → tests;
  reuse existing models where suitable and add migrations instead of editing applied ones.
- [ ] Ask before new dependencies, auth/session changes or undocumented business rules.
- [ ] Test applicable security invariants in AGENTS.md: private endpoint access,
  ownership, branch isolation, forged fields, CSRF, uploads, invitations, secrets,
  safe logging and absence of external notification/signature calls.
- [ ] Keep status history and audit events atomic; keep serializers explicit and
  server queries scoped before filtering, aggregation or export.
- [ ] Keep synthetic data and the demo workflow label visible; follow file-size
  and component/service organization rules.
- [ ] Verify command availability, then pass backend format check, lint and pytest;
  frontend format check, lint, typecheck and tests. Report passed/failed/skipped
  honestly; stop and report missing or failing formatter/lint commands.
- [ ] Update this checklist and overall phase evidence; do not close a phase with
  failing security tests or unresolved required acceptance checks.
