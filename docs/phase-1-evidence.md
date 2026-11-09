# Phase 1 prototype verification

Demo workflow — pending agency confirmation. Verified 2026-11-09 on Windows,
Python 3.14.4, Node 24, Django 6.1.3, and SQLite.

Owner instruction explicitly selects SQLite for development/prototype and defers
PostgreSQL migration/integrity validation. That deferred check has not passed.
No production readiness, agency approval or work authorization is asserted.

## Delivered slices

Implementation commit: `d33db9b`. Supporting commits: `25988b8` (foundation),
`e33a94f` (synthetic assets), `22c6b76` (test package organization).

| Slice | Implemented behavior | Evidence |
| --- | --- | --- |
| T0 | Foundation docs/commands and configurable published FL/IN/GA copy | `25988b8`; phase-0-evidence.md |
| T1 | Versioned experience/availability, legacy compatibility, scoped original answers/schema and packet association | test_applications.py; onboarding.test.tsx; browser application journey |
| T2 | Locked expected-status transitions, initial/decision history, atomic audit, one onboarding start | test_onboarding.py; test_concurrency.py; browser review journey |
| T3 | All 11 categories, generated PDF/PNG/JPEG fixtures, exact manifest validation, private immutable versions and authorized attachments | `e33a94f`; upload/permission tests; packet PDF rendered and visually checked in Chromium |
| T4 | One review per version, configurable requirements/lead days, highest approved effective version, deterministic checklist/counts | expiry boundary/replacement tests; direct integrity tests |
| T5 | Explicit completion evidence, scoped queues/counts, profile/checklist/history screens, conflict recovery | completion/rollback/permission/concurrency tests and responsive browser journey |

Tests are under `backend/apps/operations/tests/`; existing foundation account tests
remain under `backend/apps/accounts/test_foundation.py`. Frontend recovery tests
are in `frontend/src/features/onboarding/onboarding.test.tsx`. Browser tests are
in `frontend/e2e/onboarding.spec.ts`, foundation.spec.ts and styles.spec.ts.

## Verification commands and results

Backend, from `backend/` using `venv/Scripts/python.exe`:

- `-m pytest -q --basetemp=.local/<unique-test-directory>`: **127 passed**.
  A workspace-local temporary directory avoids restricted Windows temp paths;
  tests use temporary private storage. Existing Django/factory deprecations remain.
- `manage.py migrate`: passed the additive `0006_onboarding_integrity` upgrade
  on the existing local SQLite database; fresh test databases also migrate.
- `manage.py check`: passed.
- `manage.py makemigrations --check --dry-run`: no changes.
- `manage.py spectacular --file .local/openapi-phase1.yaml --validate --fail-on-warn`:
  passed without warnings/errors.
- `manage.py audit_private_files`: read-only inventory passed; no files deleted.

Frontend, from `frontend/` using `npm.cmd`:

- `run format:check`, `run lint`, `run typecheck`: passed.
- `run test`: **7 passed**, including retained answers after a server failure and
  required rejection reasons with conflict recovery.
- `run build`: passed.
- `run test:e2e`: **18 passed**. Complete application/review/upload/completion
  journeys run at 390/768/1024/1440px, including authorized packet and document
  downloads. Existing state isolation/navigation and keyboard/layout tests pass.
- Component structure checks pass: one component per file, no disabled lint rules,
  and no component over the configured 150-line limit.

Playwright uses isolated ports 5174/8001 and explicitly selected browser-test
settings with higher test-only throttle limits. Normal application throttle,
session and CSRF settings are unchanged. Tests create synthetic local accounts.

## Security and acceptance coverage

- A1–A3: original form validation/labels, packet access matrix, terminal/stale
  decisions, rejection reasons and forced-audit rollback.
- A4–A6: all categories and formats; empty/oversized/exact-limit/mismatched
  signature/type/category/digest, forged fields and missing CSRF; sequential
  replacements and exact historical downloads; pending/rejected replacements
  preserve approval, and newer expired approval never falls back to an older one.
- A5/A8: isolated real threaded SQLite transactions prove distinct upload version
  numbers and exactly one successful review, application transition and completion.
- A7/A8: yesterday/today/lead-window-end/next-day expiry boundaries, 0/0 required
  set, optional nonblocking documents, completion rollback and historical evidence
  preserved after expiry.
- A9/A10: anonymous, owner, other caregiver, client-only, ordinary staff, branch
  administrator, other-branch administrator, agency administrator, other-agency
  administrator and unassigned Django superuser; private reads/downloads/writes
  and scoped aggregates, inactive branch/assignment, unknown fields and CSRF.
- A11: complete responsive browser journey with caregiver result and downloads.
- A12: repeated seeds preserve passwords, published schema/packet and configuration
  edits; failed seeds/uploads clean newly written files. PostgreSQL-only checks
  are **deferred**, not represented by SQLite evidence.

The fixture bundle contains only labeled placeholders, no realistic identity,
health, financial or signature data. No external delivery/signature calls were
introduced. Orphan-file inventory and manual cleanup boundaries are documented
in private-files.md. Production gates remain in owner-gates.md.
