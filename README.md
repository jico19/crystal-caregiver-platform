# Caregiver Platform — Local Development

See [Database schema](docs/DATABASE_SCHEMA.md) for the implemented persistence
foundation, constraints, verification commands, and remaining workflow work.

Fresh development foundation for the FL/IN/GA caregiver platform. The current
frontend is a React/JavaScript Vite starter; the backend provides Django/DRF,
a custom user model, 39 domain tables, and a public health endpoint. Agency workflows and account
APIs are not implemented by this setup. Use synthetic data only.

## Prerequisites

Verified locally with Python 3.14.4, Node 24.15.0, and npm 11.12.1 on Windows.
Run the following PowerShell commands from the repository root unless noted.
Do not restore deleted application files or overwrite `AGENTS.md` to set up.

## Backend setup

Create the virtual environment if `backend/venv` does not already exist:

```powershell
python -m venv backend/venv
```

Install dependencies and create local configuration:

```powershell
.\backend\venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
Copy-Item backend/.env.example backend/.env.local
.\backend\venv\Scripts\python.exe -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copy the generated secret into `DJANGO_SECRET_KEY` in `backend/.env.local`. Keep
the secret local. Skip copying the example when `.env.local` already exists.
Existing process environment variables take precedence over `.env.local`.

```powershell
cd backend
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe manage.py check
.\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

These commands use `config.settings.development` and SQLite at
`backend/.local/db.sqlite3`. Activation is
optional when using the explicit interpreter path. No demo users or credentials
are seeded. An optional local administrator can be created with
`.\venv\Scripts\python.exe manage.py createsuperuser`.

## Frontend setup

In another terminal, from the repository root:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open <http://127.0.0.1:5173>. Vite uses port 5173 strictly and proxies `/api` to
<http://127.0.0.1:8000>. Use relative `/api/v1/.../` URLs with trailing slashes.
No CORS bypass is needed. Future browser authentication must use session cookies
and CSRF protection; login and CSRF bootstrap endpoints are deferred.

## Verification

From `backend/`:

```powershell
.\venv\Scripts\python.exe -m pytest apps/core/tests.py
.\venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

From `frontend/`:

```powershell
npm.cmd run lint
npm.cmd run build
```

With both servers running, these should return `{"status":"ok"}`:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health/
Invoke-RestMethod http://127.0.0.1:5173/api/v1/health/
```

The health endpoint checks process liveness, not database readiness. Backend
tests use pytest/pytest-django. The frontend has no test script yet; use Vitest
when frontend behavior tests are added. `npm.cmd run preview` previews the
production UI build only; the development API proxy is not a deployment setup.

## Configuration and boundaries

- `.env.local`, SQLite files, private media, virtual environments, dependencies, and
  build outputs are ignored. Ignore rules do not untrack previously committed
  files; existing tracked artifacts require a separate cleanup decision. Local
  configuration uses `.env.local` and `.local/db.sqlite3` because the historical
  `.env` and `db.sqlite3` paths are already tracked in Git.
- Email uses Django's console backend. SMS and other external integrations are
  absent. Do not use real contacts or sensitive documents in development.
- API access requires authenticated sessions by default. Only health is public;
  role, ownership, and branch authorization remain future implementation work.
- Production settings require a separate secret, `DJANGO_ALLOWED_HOSTS`, and
  PostgreSQL variables `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and optional
  `DB_PORT`. Deployment also needs a PostgreSQL driver, trusted TLS certificates,
  HTTPS hosting, private storage, and operational/security review. No production
  services or readiness are established by this local setup.
- The root `Scope of work.md` remains the product baseline. The previously
  referenced `docs/AGENT_BUILD_GUIDE.md` and `docs/PRD.md` are absent in this
  working tree; this setup does not recreate or reinterpret those documents.

## Setup handoff

This foundation supports Scope of Work section 1 (unified website/API) and
section 6 (security infrastructure); it does not deliver those sections in full.
Verified locally: Django system checks, applied migrations, no pending model
changes, four backend tests, dependency consistency, frontend lint/build, and
HTTP 200 responses for the frontend and direct/proxied health requests.
Pytest reports one Django deprecation warning for `EMAIL_BACKEND`; console email
remains a local transport, with migration to `MAILERS` needed before Django 2028.
Agency processes, official content, and provider decisions remain pending.
Deployment, role/state isolation, authentication flows, and full acceptance
require later work and separate evidence.
