# AGENTS.md

Multi-state (FL/IN/GA) home-care agency platform prototype.
Stack: Django + DRF backend, React + Vite + TypeScript frontend, Tailwind.
Synthetic data only. Never add real PHI, SSNs, IDs, bank details, or real documents.

Status: demo workflows are illustrative, not the agency's approved process.
Label them "Demo workflow — pending agency confirmation".

## Commands

Verify each exists before using it. If one is missing, add it under TODO and ask me; don't invent it.

```text
Backend (run from backend/)
  install:    TODO: confirm (pip/uv/poetry)
  dev:        python manage.py runserver
  test:       pytest
  lint:       ruff check .
  format:     ruff format .
  migrate:    python manage.py makemigrations && python manage.py migrate
  seed:       python manage.py seed_demo   (TODO: create in Phase 0)
  deploy chk: python manage.py check --deploy --settings=config.settings.prod

Frontend (run from frontend/)
  install:    TODO: confirm (npm/pnpm)
  dev:        npm run dev
  test:       npm run test
  lint:       npm run lint        (Biome + ESLint react rules)
  format:     npm run format      (biome format --write)
  typecheck:  npm run typecheck   (tsc --noEmit)
  e2e:        TODO: pick Playwright, add in Phase 3
```

## Tooling

- Python and Node versions: TODO: confirm and pin (`.python-version`, `.nvmrc`).
- Formatting is done only by tools: ruff (Python), Biome (TS/TSX/JS/JSON/CSS). Never format by hand.
- If a formatter or lint command is missing or fails to run, stop and report it. Don't skip it.

## Repo map

```text
backend/config/     settings/{base,dev,prod}.py, urls, wsgi/asgi
backend/apps/       one Django app per domain
frontend/src/       app/, api/, components/, features/, pages/
docs/               specs, workflows, open decisions, owner gates
```

- Create a Django app only when the current slice needs it.
- Inspect the repo first: read README, `docs/phases.md`, and existing code in the area you'll touch. If the repo is empty, start at Phase 0.

## File structure (enforced by lint)

Frontend:
- One React component per file. File name = component name (`CaregiverCard.tsx` exports `CaregiverCard`).
- Hooks live in their own file named `useX.ts`. Zod schemas and API types live in `schemas.ts` / `types.ts` beside the feature.
- Code is organized by feature: `features/<name>/{components,hooks,api}`. Shared UI goes in `components/` only after a second feature uses it.
- A component file over ~150 lines gets split: extract subcomponents into their own files.
- Lint must enforce `react/no-multi-comp` (ignoreStateless: false) and `max-lines` (150). Fix violations by splitting files, never by disabling the rule.

Backend:
- One domain per app. Business rules live in `services.py` (split into a `services/` package past ~300 lines).
- Views and serializers stay thin; use separate files once `views.py` or `serializers.py` passes ~300 lines.
- Permissions go in `permissions.py`, filters in `filters.py`, tests in `tests/test_<topic>.py`.

## Project conventions

- Custom `User` extends `AbstractUser`, and `AUTH_USER_MODEL` is set before the first migration.
- Business rules and state transitions live in domain services. Views call services; models hold integrity only.
- Every serializer lists `fields` explicitly (no `__all__`) and has separate read/write serializers when they differ.
- Every list and detail view scopes `get_queryset()` by user and branch first, then applies `select_related`/`prefetch_related`.
- Status changes write a history row and an `AuditEvent` inside `transaction.atomic()`.
- Public IDs are UUIDs. Integrity rules are DB constraints, not only validators.
- Auth: Django sessions + HttpOnly cookie + CSRF. Instead of JWT or localStorage tokens, use the CSRF bootstrap endpoint and Axios `X-CSRFToken`.
- API under `/api/v1/`, paginated, `django-filter` for filters.
- Frontend server data uses TanStack Query + the shared Axios client. Forms use React Hook Form + Zod.
- Demo notifications go to `NotificationOutbox` only. Reminder jobs are idempotent per subject/event/window.
- State-specific document and training rules are config data, marked illustrative.

## Security invariants (each must have a test)

1. Anonymous users get 401/403 on every private endpoint.
2. A user can access only their own records. Caregiver A and Client A can't read B's records or files.
3. Staff see only their membership branches, including via guessed UUIDs, exports, reports, and aggregates.
4. Client-supplied `role`, `owner_id`, `branch_id`, or `user_id` is ignored or rejected, never trusted.
5. Unsafe methods require a valid CSRF token. No `csrf_exempt`, no wildcard credentialed CORS.
6. Uploads: allowed types and max size enforced server-side; random storage keys; downloads only through an authorized endpoint; no public media URLs.
7. Staff/admin accounts are invited by an admin. Visitors can't self-register as staff.
8. No secrets in source. Use env vars and a `.env.example` with no live values.
9. Logs, emails, and test output contain no sensitive payloads. Notifications are generic and link to the portal.
10. No real SMS, email, or e-signature calls from demo or test code.

Frontend guards are UX only. The backend enforces everything.

Don't claim HIPAA compliance, legal e-sign validity, or production readiness.

## In scope now vs deferred

- Now: items 1–10 above, session auth, branch scoping, audit events, seeded demo data.
- Deferred (see `docs/owner-gates.md`): MFA, malware scanning, vendor/BAA review, backups, object storage, Sentry.

## Boundaries

Always:
- Work in vertical slices: model → service → API → React screen → tests.
- Make small commits on a feature branch with clear messages.
- Add negative permission tests with every new endpoint.

Ask first:
- A business rule not in `docs/`; record it in `docs/open-decisions.md` and use the simplest configurable demo behavior.
- New dependencies, destructive or irreversible migrations, auth or session changes, and changing the formatter or lint config.

Never (instead → do this):
- Edit an applied migration → add a new migration.
- Invent legal, Medicaid, licensure, or HR requirements → make it configurable and mark it illustrative.
- Force-push, rewrite shared history, or commit to `main` → use a feature branch.
- Mark work done with failing security tests → report the failure.

## Definition of done

All must pass, then report passed / failed / skipped honestly:

```text
backend:  ruff format --check . && ruff check . && pytest
frontend: npm run format:check && npm run lint && npm run typecheck && npm run test
```

Plus: new endpoints have permission and branch-isolation tests, and no file breaks the file-structure rules.

## Current focus

See `docs/phases.md`. Do one phase at a time.

## Docs (read when relevant)

- `docs/domain-model.md`: before adding or changing models or roles
- `docs/workflows.md`: before implementing status transitions
- `docs/api-conventions.md`: before adding endpoints
- `docs/phases.md`: at task start
- `docs/open-decisions.md`: when you hit an unknown business rule
- `docs/owner-gates.md`: human-only items; don't act on these