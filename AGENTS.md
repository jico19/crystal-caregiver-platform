# AGENTS.md — Caregiver Platform

Multi-state (FL/IN/GA) home-care platform: caregiver onboarding, client intake, compliance, training, and admin ops. Monorepo with a Django backend, a Vite/React frontend, and a contract/spec doc set. No git repo, no CI.

## Layout

- `backend/` — Django 6.1 + DRF 3.18 + SimpleJWT (Python). Apps live under `backend/apps/*`; settings split across `config/settings/{base,development,production}.py`. Virtualenv at `backend/venv/`.
- `frontend/` — React 19 + Vite + Tailwind CSS v4 + React Router v7 + TanStack Query v5 + Radix UI. Plain JavaScript/JSX (no TypeScript).
- `docs/` — `PRD.md`, `SAD.md`, `API_CONTRACTS.md`, `DATABASE_SCHEMA_AND_DATA_DICTIONARY.md`, `SECURITY_REQUIREMENTS.md`, `design.md`. Source of truth for schemas/endpoints; trust these over frontend code when they conflict.

## Commands

Backend (from `backend/`, activate venv first):

- Activate: `backend\venv\Scripts\activate`, then all `manage.py` commands below (they default to `config.settings.development`).
- Dev server: `python manage.py runserver` (serves `:8000`; Vite proxies `/api` to it).
- Migrate: `python manage.py migrate`.
- First-time seed: `python manage.py seed_initial_data` — states/roles/doc-types/courses/marketing + default admin `admin@caregiverplatform.com` / `AdminPassword123!`.
- Sample users for every role/state: `python seed_users.py`. This is a **plain script**, not a management command, and it **resets every user's password to `password123`**.
- Tests: `pytest` with `pytest-django` and `--reuse-db` (`pytest.ini`). Run scoped app tests only for your task to avoid overhead (e.g. `pytest apps/compliance/tests.py`, `pytest apps/caregivers/tests.py`, `pytest apps/authentication/tests.py`) or targeted tests with `pytest -k <test_name>`. Run full suite with `pytest`. Base fixtures live in `apps/core/test_utils.py` (`BasePlatformTestCase`).

Frontend (from `frontend/`):

- `npm run dev` (port 5173, proxies `/api` → `http://127.0.0.1:8000`), `npm run build`, `npm run preview`.
- `npm run lint` is **oxlint** — there is no ESLint or Prettier config.
- No frontend test runner is configured.

## Architecture notes

- DB switches on `backend/.env`: SQLite by default (`backend/db.sqlite3`); PostgreSQL 16+ auto-selected when `DB_ENGINE=postgresql` and `DB_PASSWORD` is set.
- Custom user model: `AUTH_USER_MODEL = "authentication.User"`. Roles and states are FKs (`user.role.name`, `user.state`).
- All API routes use trailing slashes under `/api/v1/...` (`config/urls.py`). The frontend auth layer calls `/auth/me/` with a cached `/auth/me` fallback — preserve both.
- JWT via SimpleJWT (access 60 min, refresh 7 d, rotate+blacklist). Token lives in `localStorage['caregiver_access_token']`, refresh in `'refresh'`.
- Frontend API callers use `frontend/src/shared/services/api.js` — a fetch wrapper (axios is in package.json but unused). It injects an `X-Agency-State` header from `localStorage['selected_state']` on every request; that header is in the backend CORS allow-list.
- Documents handled via built-in Django media storage (`backend/media/`, proxied via Vite `/media`) with HMAC signed tokens for direct upload/download; AWS S3 optional via `USE_S3=true`. Certificates/PDFs generated via reportlab.

## RBAC & state scoping (non-negotiable)

- Backend permission classes: `backend/apps/core/permissions.py` (`IsSuperAdmin`, `IsStateScopedAdmin`, `IsCaregiver`, `IsClient`). `IsStateScopedAdmin` raises 403 for administrators with `state_id IS NULL`, and object checks enforce `obj.state_id == request.user.state_id`. Reuse these; never write ad-hoc `role == ...` checks.
- Frontend: check roles only through helpers in `src/shared/lib/roles.js` (`isAdmin`, `isSuperAdmin`, `homePathFor`). A bare `role === 'administrator'` silently drops `super_admin` into the wrong portal.
- State administrators are locked to their assigned state — no state switcher. Public landing pages are `/florida`, `/indiana`, `/georgia`.
- Status enums live in `src/shared/constants/*.js` and must match `docs/DATABASE_SCHEMA_AND_DATA_DICTIONARY.md`; keep them in sync when adding states.

## Gotchas

- `frontend/CONTEXT.md` (auto-loaded into sessions) describes the backend as FastAPI + Supabase/GoTrue. That is **stale** — the backend is Django DRF + SimpleJWT. Also ignore `roles.js` comments referencing `supabase/migrations`. Trust `docs/` and the actual code on conflict.
- Not a git repo and no root `.gitignore`: `backend/db.sqlite3`, `backend/venv/`, and `frontend/node_modules/` all sit in the tree. Don't delete or regenerate the DB casually.
- `seed_initial_data` is idempotent; `seed_users.py` is not (resets passwords).
- Frontend sometimes calls endpoints that don't exist in backend `urls.py` yet. Verify a route against `config/urls.py` + `apps/*/urls.py` and `docs/API_CONTRACTS.md` before debugging against a phantom API.

## Use built-in skills when the situation fits

- `tdd` / `surgical-patch` — fixing a backend bug: add/extend `apps/<app_name>/tests.py` cases first, run scoped `pytest apps/<app_name>/tests.py`, then patch.
- `shadcn` / `emil-design-eng` / `ui-taste` — building or polishing UI. The repo already ships shadcn-style primitives under `@/components/ui/` and shared components in `src/shared/components/common/`; reuse those instead of adding new dependencies.
- `web-design-guidelines` — before/after UI work; `docs/design.md` enforces strict anti-slop and contrast rules.
- `diagnosing-bugs` / `investigate-first` — for hard or ambiguous failure hunts before editing code.
- `safe-refactor` — for behavior-preserving cross-file restructures.
- `verify-and-stop` — to prove work meets acceptance criteria without expanding scope.
- `improve` / `improve-codebase-architecture` — for audits or handoff plans for other agents to implement.
- `caveman*` — only when the user explicitly asks for compressed/terse output.
- `supabase` / `supabase-postgres-best-practices` — only if a task actually touches Supabase. The backend is plain Django/Postgres, so default to standard Django migrations and ORM.