# Crystal Care ? Phase 0 foundation

Synthetic data only. Demo workflow ? pending agency confirmation.

The prototype includes public FL/IN/GA pages, job application/account creation,
session login/logout, password reset, client/state-admin invitations, scoped
record APIs, and protected portal shells. See [scope](docs/prototype-scope.md),
[API/architecture](docs/architecture.md), [open decisions](docs/open-decisions.md),
[security gates](docs/security-checklist.md), and [schema](docs/DATABASE_SCHEMA.md).

## Local setup (PowerShell)

Prerequisites: Python 3.14 and Node 24/npm. From the repository root:

```powershell
python -m venv backend/venv
./backend/venv/Scripts/python.exe -m pip install -r backend/requirements-dev.txt
Copy-Item backend/.env.example backend/.env.local
./backend/venv/Scripts/python.exe -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Skip copying if .env.local exists. Put the generated secret into DJANGO_SECRET_KEY
in that ignored local file. Never overwrite existing local configuration.

```powershell
cd backend
./venv/Scripts/python.exe manage.py check_login_emails
./venv/Scripts/python.exe manage.py migrate
./venv/Scripts/python.exe manage.py seed_demo | Tee-Object -FilePath .local/demo-accounts.txt
./venv/Scripts/python.exe manage.py runserver 127.0.0.1:8000
```

The preflight reports legacy blank/duplicate emails without changing accounts.
Resolve those explicitly using synthetic verified addresses before email login or
applying the email uniqueness migration. Empty legacy emails are preserved but
cannot sign in to the portal. Database schema changes use additive migrations.

**Keep the first seed output privately.** It contains generated demo passwords for
new accounts only. On subsequent seeds omit Tee-Object, or use a different output
file; reruns never print or reset existing passwords. This workspace already has
first-run credentials in ignored backend/.local/demo-accounts.txt. Never commit it.
The browser administrator test uses that file. For a lost demo password use Django's
explicit changepassword command, and update the private test credential record.

In another terminal from the root:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open http://127.0.0.1:5173. Vite proxies /api to Django on port 8000; no CORS bypass.
Use this hostname consistently for cookies. Production preview has no API proxy.

## Demo accounts and walkthrough

Use generated passwords from the first seed output. Accounts include
agency-admin@demo.example, state-admin-fl@demo.example (also in/ga),
caregiver-fl-1@demo.example and client-fl-1@demo.example (two per state).
Visitors do not need an account. Staff-role assignments receive no management
access until their policy is confirmed. Django admin flags alone grant no portal rights.

1. Select a public state, open a demo job and submit synthetic name/email/password.
2. The caregiver portal shows submitted application status; sign out and sign in.
3. Sign in as Florida state-admin: only Florida directory records are visible.
4. Sign in as agency-admin: filter records across authorized FL/IN/GA branches.
5. Create a client invitation, open its link from the backend console, and accept.
6. Use forgot-password; open the local console reset link and choose a new password.

Invitations expire in 24 hours, resets in one hour, sessions in eight hours.
Existing-account invitation acceptance requires signing into that account first.
The prototype does not send external email/SMS or accept uploaded documents.

## Verification

From backend/:

```powershell
./venv/Scripts/python.exe -m pytest --create-db -q
./venv/Scripts/python.exe manage.py check
./venv/Scripts/python.exe manage.py makemigrations --check --dry-run
./venv/Scripts/python.exe manage.py spectacular --file .local/openapi.yaml --validate --fail-on-warn
./venv/Scripts/python.exe -m pip check
```

From frontend/:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Browser tests start local servers when needed, require seeded jobs and first-run
credentials, and create unique synthetic applicant accounts in the local database.
They do not reset existing data. Screenshots are in ignored frontend/test-results/.
OpenAPI docs at /api/v1/docs/ require an authenticated session.

## Remaining gates

PostgreSQL migration/integrity testing, MFA, hosting, official branch content,
client inquiry persistence, credential uploads/review, care workflows and reporting
remain separate work. No PHI, production readiness, HIPAA certification, or agency
workflow approval is claimed. Development email uses Django's console backend;
Django warns this configuration needs migration to MAILERS before Django 2028.

Historical tracked artifacts/secrets require a separate hygiene review. Local
secrets/data use .env.local and .local instead. Missing historical PRD/build-guide
references were reconciled against current code, not restored.
