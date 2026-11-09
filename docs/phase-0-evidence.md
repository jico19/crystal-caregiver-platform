# Phase 0 reconciliation evidence

Reviewed 2026-11-09. Phase 0 remains open.

Demo workflow — pending agency confirmation.

## Tooling reconciliation

- Python runtime and root `.python-version` agree: 3.14.4.
- Node runtime is 24.15.0; `frontend/.nvmrc` selects major version 24.
- README documents pip with `requirements-dev.txt` and npm with `npm ci`.
  AGENTS.md still lists installation commands as awaiting confirmation.
- Backend formatter/lint dependency, configuration and required commands were
  removed at the owner's request on 2026-11-09. No replacement is configured.
- Frontend scripts exist for formatting, lint, typecheck, tests and Playwright.
  Formatting uses Oxfmt and lint uses Oxlint. The owner confirmed both tools;
  AGENTS.md matches these frontend tools.
- The deploy-check command in AGENTS.md names `config.settings.prod`, which
  does not exist. The existing module is `config.settings.production`.
- `backend/pytest.ini` selects `config.settings.development`, but
  `backend/pyproject.toml` contains the nonexistent `config.settings.dev`.
- `seed_demo` already exists; the AGENTS.md TODO to create it is stale.

## Verification results

- Backend formatter/lint checks are no longer configured or required, following
  the owner's tooling removal request. This does not establish code quality or
  resolve the findings from the retired static checks.
- Passed: backend pytest, 86 tests on SQLite, during frontend verification.
- Passed: frontend `npm.cmd run format:check`, `npm.cmd run lint`,
  `npm.cmd run typecheck`, `npm.cmd run test` (5 tests), `npm.cmd run build`,
  and `npm.cmd run test:e2e` (13 tests), in commit `40f3c6b`.
- Unverified: PostgreSQL migration/integrity checks. A running local PostgreSQL 18
  service was discovered later; a disposable test target has not been verified.

## TODO — decisions needed to resume

- Confirm pip/npm as the installation commands before replacing their TODOs.
- Reconcile settings module names in documentation and pytest configuration.

## Remaining Phase 0 work (unverified)

- README links to missing `prototype-scope.md`, `architecture.md`,
  `security-checklist.md` and `DATABASE_SCHEMA.md`; create these from code.
- Validate migrations and integrity constraints on PostgreSQL; current shared
  settings default to SQLite. A disposable PostgreSQL test target remains
  unverified, so this required gate remains pending.
- Owner confirmed retaining demo branch boundaries and disabled ordinary staff
  management access; recorded in `docs/open-decisions.md`. Legal structure and
  future staff permissions remain unanswered.
- Public state selection and state-filtered jobs exist, but services/licensing/
  contact copy is generic and there is no complete configurable state forms
  content. Implement and verify the scope section 1 content slice after the
  tooling gate is resolved.
- Reconcile all foundation acceptance criteria against actual test results before
  checking off Phase 0 in `phases.md` or `implementation-checklist.md`.
