# Phase 0 reconciliation evidence

Reviewed 2026-11-09. Phase 0 remains open.

Demo workflow — pending agency confirmation.

## Tooling reconciliation

- Python runtime and root `.python-version` agree: 3.14.4.
- Node runtime is 24.15.0; `frontend/.nvmrc` selects major version 24.
- README documents pip with `requirements-dev.txt` and npm with `npm ci`.
  AGENTS.md still lists installation commands as awaiting confirmation.
- Backend Ruff is available in `backend/venv/Scripts/ruff.exe`.
- Frontend scripts exist for formatting, lint, typecheck, tests and Playwright.
  Formatting uses Oxfmt and lint uses Oxlint. The owner confirmed both tools;
  AGENTS.md now matches them. No dependency or tool configuration was changed.
- The deploy-check command in AGENTS.md names `config.settings.prod`, which
  does not exist. The existing module is `config.settings.production`.
- `backend/pytest.ini` selects `config.settings.development`, but
  `backend/pyproject.toml` contains the nonexistent `config.settings.dev`.
- `seed_demo` already exists; the AGENTS.md TODO to create it is stale.

## Verification results

- Passed: backend `ruff format --check .` (55 files).
- Failed: backend `ruff check .` (438 existing errors). Findings include
  docstrings, import ordering, Django rules and security rules flagging assertions
  in tests. No rules have been weakened or disabled.
- Failed: frontend `npm.cmd run format:check`; Oxfmt reports
  `src/app/App.tsx`. This file already had an uncommitted user edit at task start;
  it has not been changed by this reconciliation.
- Skipped: remaining frontend lint, test, typecheck, browser and PostgreSQL checks.
  AGENTS.md requires stopping on formatter or lint failure.

## TODO — decisions needed to resume

- Resolve the existing backend lint failure before further implementation.
- Tool-format the existing App.tsx edit with the confirmed Oxfmt tool to clear
  the frontend format gate when implementation resumes.
- Confirm pip/npm as the installation commands before replacing their TODOs.
- Reconcile settings module names in documentation and pytest configuration.

## Remaining Phase 0 work (unverified)

- README links to missing `prototype-scope.md`, `architecture.md`,
  `security-checklist.md` and `DATABASE_SCHEMA.md`; create these from code.
- Validate migrations and integrity constraints on PostgreSQL; current shared
  settings default to SQLite. Owner confirmed no disposable PostgreSQL database
  is available, so this required gate remains pending.
- Owner confirmed retaining demo branch boundaries and disabled ordinary staff
  management access; recorded in `docs/open-decisions.md`. Legal structure and
  future staff permissions remain unanswered.
- Public state selection and state-filtered jobs exist, but services/licensing/
  contact copy is generic and there is no complete configurable state forms
  content. Implement and verify the scope section 1 content slice after the
  tooling gate is resolved.
- Reconcile all foundation acceptance criteria against actual test results before
  checking off Phase 0 in `phases.md` or `implementation-checklist.md`.
