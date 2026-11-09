# Phase 1 implementation tasks and evidence

Status: all application tasks pending. Version 1, 2026-11-09.

Demo workflow — pending agency confirmation.

Contract: [requirements](phase-1-requirements.md) and [design](phase-1-design.md).
Requirement/scenario IDs below refer to those documents. Do not mark a task done
from model existence alone. Deliver model → service → API → React screen → tests.

## Ordered vertical slices

### T0 — prerequisite gate

- [ ] Close Phase 0 and record evidence in the overall phase tracker. Resolve the
  frontend verification and command discrepancies; finish
  foundation content/docs and security checks. Do not change tooling/dependencies
  without the repository-required approval.
- [ ] Obtain a disposable PostgreSQL test environment and verify existing
  migrations/integrity. None is currently available; do not substitute SQLite
  results for this gate or create a production database.
- [ ] Review this package against code at implementation start and verify all
  required commands exist. Resolve new business questions in open decisions.

Evidence: foundation check results and PostgreSQL migration/integrity results.
Requirements P1-01, P1-16–17; scenarios A9, A10, A12. T1–T5 depend on T0.

### T1 — versioned application and readable details

- [ ] Create new illustrative FormVersions with extended field schema; preserve
  published legacy versions and submissions. Prepare versioned packet association
  before publication; packet bytes/download service are completed in T3.
- [ ] Validate answers against the job's version in the submission service; retain
  ownership/account/duplicate protections. Store answers without credentials.
- [ ] Extend job detail and authorized application detail serializers/API, rendering
  old/new labels and answers without exposing other subjects.
- [ ] Extend application form and administrator/owner detail screens, with recovery
  from invalid answers, server failure and stale job availability.
- [ ] Prove legacy/new form compatibility and all permissions on detail reads.

Evidence: A1, A9, A10 and mobile application portion of A11.
Requirements P1-01–04, P1-15–17. No new auth/session behavior.

### T2 — application review and onboarding start

- [ ] Add application status constraints and onboarding event structure with
  branch/append-only guards. Preflight existing data; stop on invalid legacy rows.
- [ ] Implement locked transitions, initial submission history and atomic audit.
  Approval starts onboarding once per caregiver; independent applications retain
  independent outcomes. Never demote a completed milestone via another application.
- [ ] Expose transition API and review history; add administrator review controls
  and caregiver status display. Require rejection reasons and refresh on conflict.
- [ ] Prove duplicate/stale/concurrent transitions and forced-audit rollback.

Evidence: A3, A9, A10. Requirements P1-06–07, P1-16–17. Depends on T1.

### T3 — synthetic packets and private fixture-file lifecycle

- [ ] Preserve catalog codes and generate a versioned synthetic PDF packet plus
  approved PDF/PNG/JPEG fixture manifest. Check visible synthetic labels and absence
  of realistic identifiers. If generation needs a dependency, request approval first.
- [ ] Add logical caregiver/category uniqueness after duplicate preflight. Implement
  streaming validation, manifest verification, randomized private writes, checksums,
  monotonic versions and rollback cleanup; never expose storage keys.
- [ ] Implement authorized packet/document reads and attachments, owner-only fixture
  upload, and private file failure handling. Document dry-run orphan cleanup.
- [ ] Add fixture selector/upload/version/download UI, preserving all 11 categories.
  No arbitrary local file selection; crafted real uploads must fail server validation.
- [ ] Test all file limits, malformed requests, access paths, concurrency and failure
  cleanup. Verify exact original bytes on historical downloads.

Evidence: A2, A4, A5 (upload portion), A9, A10, A12 (fixture seed portion).
Requirements P1-05, P1-09–11, P1-15–17. Depends on T1 and T2.

### T4 — document review, configuration and derived checklist

- [ ] Add one-review-per-version constraint and BranchOnboardingPolicy with required
  database guards. Seed missing demo requirements/policies without overwriting
  operator edits. Reuse existing catalog and requirement models.
- [ ] Implement locked document decisions with append-only history/audit and reasons;
  define current effective version and deterministic expiry/count calculations.
- [ ] Expose document review/detail and onboarding read APIs; render review controls,
  history and per-caregiver checklist with latest/effective versions distinguished.
- [ ] Test date boundaries, required/optional behavior, legacy data and pending/
  rejected replacements, rollback and concurrent review.

Evidence: A5 (review portion), A6, A7, A9, A10, A12.
Requirements P1-08–09, P1-12–13, P1-15–17. Depends on T3.

### T5 — dashboards, explicit completion and end-to-end verification

- [ ] Implement locked completion service and evidence history; reject unmet
  prerequisites and repeated completion. Keep historical milestone separate from
  current readiness after expiry or configuration changes.
- [ ] Expose completion and administrator queue APIs, scoping before filters and
  aggregates. Assemble caregiver profile/application/document summary and scoped
  administrator onboarding/compliance screens with explicit demo terminology.
- [ ] Complete keyboard/mobile states and conflict handling; ensure public state
  navigation cannot broaden private access. Invalidate all affected query caches.
- [ ] Run full synthetic browser journey and permission matrix, including file
  downloads and another caregiver/branch/agency denial. Update implementation
  checklist only with linked passing evidence.

Evidence: A8–A12 and complete A11 at 390/768/1024/1440px.
Requirements P1-07–08, P1-14–17. Depends on T4.

## Verification and completion record

Every slice adds negative tests with its endpoints, including anonymous, wrong
caregiver/branch/agency, ordinary staff, forged fields and CSRF. Use synthetic data
and temporary private storage. Tests must not invoke external delivery/signatures.
Test DB constraints through direct writes on PostgreSQL as well as local SQLite;
test additive migration upgrades without editing historical migration files.

Before use, verify these existing commands and execute from their corresponding
project directories with the available virtual environment/npm executable:

```text
backend:
  pytest
frontend:
  npm run format:check
  npm run lint
  npm run typecheck
  npm run test
  npm run test:e2e
```

Stop/report missing or failing formatter/lint commands per AGENTS.md. Do not weaken
rules or call a slice done with failing security checks. No formatter/lint changes,
dependencies, auth changes or destructive migrations are authorized by this spec.

The owner subsequently removed backend formatter/lint tooling. Backend verification
uses pytest; frontend formatting/lint checks remain required. No replacement backend
formatter or linter is configured.

For each slice record commit, requirements/scenarios exercised, exact commands and
environment (SQLite/PostgreSQL), passed/failed/skipped results and evidence paths.
Capture no passwords, answers or file bytes in reports. Only close Phase 1 after
all requirements, browser scenarios, structure rules and required checks pass.
Spec creation alone changes no implementation checkboxes.
