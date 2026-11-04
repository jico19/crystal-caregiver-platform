# AGENTS.md — Caregiver Platform

Multi-state (FL/IN/GA) home-care platform: caregiver onboarding, client intake, compliance, training, and admin ops. Monorepo with a Django backend, a Vite/React frontend, and a contract/spec doc set. Git repository; no CI.

## Requirements authority and delivery stage

- `docs/Scope of work.md` is the sole product requirements baseline. Keep it unchanged. Later explicit user instructions can clarify scope; internal specs cannot enlarge it.
- Read `docs/AGENT_BUILD_GUIDE.md` and the scope-aligned `docs/PRD.md` before planning or implementing. The guide identifies basic flows, pending client decisions, optional features and unsupported additions.
- Build basic functioning flows where the agency process is unknown: real persistence, accurate statuses, permissions and feedback. Record pending policy/content/provider decisions; do not invent approval gates, billing rules, quiz scores or reminder schedules as client requirements.
- Basic functionality is an interim delivery stage, not full client acceptance. Track technical readiness, client process confirmation and deployment evidence separately. Do not weaken security or use fake data to claim a flow works.
- PRD, SAD, API/schema/security/design docs and dated plans are subordinate references. Inspect current code for actual technical contracts and update relevant discrepancies. Historical audits are not current completion evidence.
- Preserve existing features, data and safeguards; narrowing scope does not authorize deleting them. Secure agency messaging is optional. Email/SMS and the six named reports remain required even when delivery details need client input.

## Product boundaries and pending client processes

We are building an agency website, digital front desk and paperwork office for FL/IN/GA. Care.com can inform presentation, but public caregiver search, ratings, direct family hiring and marketplace memberships are not requested features.

- Use simple, working submission, upload, review, tracking and viewing flows while the agency's actual process is being confirmed. Prefer existing modules and manual staff actions over speculative automation or a new workflow engine.
- Obtain agency input for official employment/admission packets, form fields and signature text; mandatory documents per state; application/admission approval steps; training content and completion rules; authorization review meanings; care-plan/schedule ownership; report definitions; and notification providers, recipients and timing.
- Do not silently make every listed upload category mandatory. Support both Auto Insurance and Driver's Insurance until the agency clarifies whether they are duplicates.
- Do not add billing/HCPCS unit calculations, automatic staffing gates, quizzes/pass scores, report exports, retention/purge rules or external integrations as mandatory requirements merely because older docs or existing code mention them.
- Continue independent work while client input is pending. Repair broken APIs, incorrect data and security defects without treating developer problems as client-process questions.
- Keep missing agency content and unconfigured integrations explicit. Do not fabricate official forms, clinical instructions, licensing claims, training evidence or successful email/SMS delivery. A development sender does not prove live delivery.
- For each feature handoff, record the Scope of Work section, basic behavior delivered, verification evidence, pending client decisions and remaining deployment dependencies. Distinguish basic working functionality from confirmed agency workflow and full acceptance.

## Layout

- `backend/` — Django 6.1 + DRF 3.18 + SimpleJWT (Python). Apps live under `backend/apps/*`; settings split across `config/settings/{base,development,production}.py`. Virtualenv at `backend/venv/`.
- `frontend/` — React 19 + Vite + Tailwind CSS v4 + React Router v7 + TanStack Query v5 + Radix UI. Plain JavaScript/JSX (no TypeScript).
- `docs/` — `PRD.md`, `SAD.md`, `API_CONTRACTS.md`, `DATABASE_SCHEMA_AND_DATA_DICTIONARY.md`, `SECURITY_REQUIREMENTS.md`, `design.md`. Supporting technical references subordinate to `docs/Scope of work.md`. Resolve contract differences by inspecting current backend routes, serializers, models/migrations and frontend consumers; these documents cannot introduce product requirements.

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
- `npm test` discovers colocated Node unit tests and integration suites in `frontend/scripts/`.

## Code readability & modularity

- Prioritize readability and maintainability over cleverness or unnecessary complexity. Use clear names, straightforward control flow, and the simplest design that meets the requirement.
- Give each feature one clear purpose and each module, component, hook, service, and function one focused responsibility. Separate unrelated behavior so changes remain isolated and avoid conflicts.
- Split code into focused modules when responsibilities can be separated meaningfully, especially when a file mixes UI, data access, and business rules. Avoid oversized files and functions, but do not add abstractions or tiny files that make the code harder to follow.
- Keep feature-specific code within its feature. Move code into shared modules only when it is genuinely reusable, and use explicit interfaces between features instead of reaching into their internal implementation.
- Keep refactoring relevant to the requested change; do not reorganize unrelated features.

## Testing policy

- Do not add or run tests for simple, low-impact code changes, such as copy edits, styling tweaks, or straightforward changes with no meaningful behavior risk. Review the diff instead.
- Test important changes that affect business logic, authentication, permissions, state scoping, data integrity, API behavior, or critical user flows. Judge importance by risk, not by the number of lines changed.
- Use the smallest relevant test scope. Run broader suites only when the change or a failure warrants them, or when the user explicitly requests them.

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
- Status constants live in `src/shared/constants/*.js`; keep them aligned with current backend model/serializer enums and update the schema reference when relevant. Existing enum values are implementation details, not proof of client-approved workflow stages.
