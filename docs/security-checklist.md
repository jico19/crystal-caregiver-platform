# Security checks

Demo workflow — pending agency confirmation. Synthetic data only.

Foundation tests cover anonymous denial, session CSRF, ownership and branch
isolation, forged fields, invitation permissions/expiry, reset behavior and safe
API errors. See `backend/apps/accounts/test_foundation.py`, core tests and domain
integrity tests. These tests do not establish compliance or production readiness.

- Every new private endpoint needs negative ownership/branch/agency tests.
- Unsafe requests require CSRF; public registration cannot create staff accounts.
- Business access derives from active assignments, never public state selection.
- Do not expose storage keys, credentials, private payloads or public media URLs.
- Secrets remain in environment variables or ignored `.env.local`.
- Seeds and test fixtures contain synthetic data only; tests use local delivery.
- Status changes require atomic history/audit and duplicate/stale-action handling.

Run backend pytest and frontend format, lint, typecheck and unit tests for each
slice, plus browser journeys as applicable. SQLite is used for prototype tests;
PostgreSQL validation remains deferred. Human-owned production gates remain in
`owner-gates.md` and are not authorized by prototype work.
