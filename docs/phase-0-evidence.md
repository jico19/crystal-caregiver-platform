# Phase 0 reconciliation evidence

Reviewed 2026-11-09. Foundation verified for the SQLite prototype.

Demo workflow - pending agency confirmation.

## Runtime and commands

Python 3.14.4 and Node 24 are pinned. Owner confirmed pip/npm installation.
AGENTS.md now names existing development/production settings, seed, test and
Playwright commands. Conflicting pytest settings were reconciled. Backend static
tooling was removed by owner request; frontend Oxfmt/Oxlint remain required.

## Implemented foundation

Public FL/IN/GA switching, state-filtered jobs and configurable published services,
forms, licensing and contact content are implemented. Seeds preserve content edits
and publication state. Missing README scope, architecture, schema and security
links now resolve to code-based documents. Existing session/CSRF, invitations,
password reset, scoped directories, UUID lookups and role shells are preserved.

## Verification

- Backend: `venv/Scripts/python.exe -m pytest -q`: 88 passed on SQLite.
- Backend: `manage.py check`: passed; `makemigrations --check --dry-run`: no changes.
- Frontend: format:check, lint, typecheck and unit tests passed (5 tests).
- Browser: `npm.cmd run test:e2e`: 14 passed, including state copy/job context,
  branch authorization, application/login and responsive layouts at 320-1440px.
- Seed reruns preserve operator edits; tested with synthetic records.
- PostgreSQL validation: deferred by owner instruction on 2026-11-09. Not passed.

SQLite is the development/prototype database. PostgreSQL migration, production
storage, deployment, agency policy and owner gates remain separate work. This
record does not assert production readiness or agency workflow approval.
