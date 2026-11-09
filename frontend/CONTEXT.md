# Caregiver Platform frontend and backend context

For agents implementing or reviewing the clinical care portal. Preserve the
compact layout, readable status colors, and state-scoped access boundaries.
`docs/Scope of work.md` records product scope; `docs/specs/` records cleanup
requirements. Verify implementation claims against the current source.

## Repository and runtime

- `frontend/`: React 19, Vite, Tailwind CSS v4, Radix UI, Lucide React,
  React Router v7, and TanStack Query v5. Role screens live in `src/features/`;
  hooks, services, layouts, and shared components live in `src/shared/`.
  Low-level UI primitives live in `src/components/ui/`.
- `backend/`: Django and Django REST Framework (DRF). Domain code lives in
  `apps/`, including models, serializers, views, services, tests, and migrations.
  `config/urls.py` mounts `/api/v1/`, `/api/health/`, and `/django-admin/`.
- `backend/config/settings/base.py` loads `backend/.env`. `development.py`
  and `production.py` supply environment-specific behavior; `manage.py`
  defaults to development. Production settings enable HTTPS redirects, HSTS,
  secure cookies, and other security headers.
- SQLite is the database default. `DB_ENGINE=postgresql` explicitly selects
  PostgreSQL; consult `base.py` for the exact fallback condition.
  `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT` configure it.
  Local media is the storage default. `USE_S3=true` with AWS keys enables the
  S3 path in `apps/core/storage.py`; bucket, region, and presigned expiration
  are environment-driven. `.env.example` does not enumerate every setting.
- `src/shared/services/api.js` uses `VITE_API_URL`, defaulting to
  `http://localhost:8000/api/v1`. Vite also proxies relative `/api` and
  `/media` requests to port 8000 during development.

## Authentication, roles, and state scope

The backend uses DRF SimpleJWT and the Django user model in
`apps/authentication/models.py`. `StrictJWTAuthentication` in
`apps/authentication/authentication.py` checks the database user on each
authenticated request and rejects inactive, suspended, or deleted accounts.
DRF defaults to `IsAuthenticated`.

`apps/authentication/urls.py` defines token obtain/refresh, registration,
logout, and `/auth/me/`. `SIMPLE_JWT` in `config/settings/base.py` configures
60-minute access tokens and seven-day refresh tokens, rotation, and blacklisting.
`src/shared/contexts/AuthContext.jsx` restores the profile via `/auth/me/`.
It stores access tokens under `localStorage['caregiver_access_token']` and
refresh tokens under `localStorage['refresh']`. The shared API client sends
Bearer tokens and attempts refresh on eligible 401 responses. Logout posts
the refresh token for blacklisting and clears the local session/query cache.
Legacy fallback endpoint names remain in the frontend; they are not separate
authentication providers.

| Role | Intended scope |
| --- | --- |
| `super_admin` | Administrative access across states. |
| `administrator` | Administrative access within the assigned `state_id`. |
| `caregiver` | Own onboarding/credentials and assigned client care. |
| `client` | Own intake, agreements, documents, and care records. |

Use `isAdmin`, `isSuperAdmin`, `isStateAdmin`, `homePathFor`, and
`stateLabelFor` from `src/shared/lib/roles.js`. `isAdmin` includes both admin
roles. Display helpers and frontend route guards do not enforce API access.

`src/routes/AppRoutes.jsx` mounts the portals under layouts in
`src/shared/layouts/`. `AdminLayout` uses `StateAdminLayout` for regional
administrators. Reports, users, settings, and audit-log routes additionally
use `SuperAdminOnlyRoute`. Missing sessions redirect to the relevant login.
Public state pages live under `/:state`; `/caregiver/application` also
supports public applications.

Offer all-state filters only to super administrators. Regional administrators
must receive only their assigned state. Use state IDs returned by the API;
do not hardcode database IDs. Filter values and `X-Agency-State` are request
hints, never authoritative identity. `stateLabelFor` has legacy fallbacks
and is a display helper only.

Backend enforcement lives in `apps/core/permissions.py` and `mixins.py`.
`IsStateScopedAdmin` rejects administrators without a jurisdiction.
`ScopedStateQuerySetMixin` filters regional admin querysets to that state;
super administrators can query across states. Custom views also perform
explicit owner, assignment, or state checks. Scoped lookups can return 404;
explicit permission checks can return 403. Do not promise one status code
for all cross-state requests. `IsCaregiver` and `IsClient` also permit super
administrators; endpoints still enforce their object lookups and ownership.

## UI system and page composition

`src/index.css` owns semantic HSL values. Tailwind's `@theme inline` maps
them to `bg-primary`, `text-primary-foreground`, `border-input`, `ring-ring`,
and related utilities. Primary actions use green 700 with white text for
readable small labels and a darker hover. Destructive actions use red;
neutral surfaces/borders use slate. Legacy `--color-base-*` and content
aliases remain for shell CSS. Do not duplicate the primary palette in controls.
The portal exposes a light UI without a theme switch. CSS has dark overrides;
that does not establish full dark-theme support across feature screens.

`src/shared/components/sidebar/PortalShell.jsx` composes `PortalSidebar` and
`PortalTopBar`, with desktop collapse state in
`localStorage['cp_sidebar_collapsed']` and an Escape-dismissable mobile drawer.
Navigation groups live in each role layout; consult those files and routes
instead of assuming all administrators share a menu.

Prefer existing shared components in `src/shared/components/common/`:

- `PageContainer`: default (`max-w-6xl`), narrow (`max-w-4xl`), or wide
  (`max-w-7xl`); `PageHeader`: title, subtitle, badge, and actions.
- Shared `Card`: title, subtitle, actions, and compact padding. The primitive
  `@/components/ui/card` has a separate composable API.
- `DataTable`, `StatusBadge`, `LoadingState`, `Skeleton`, `EmptyState`,
  `ErrorBoundary`, and `ConfirmModal` for their existing use cases.
- `@/components/ui/`: Button, Input, Badge, Select, Dialog, Tabs, Table,
  DropdownMenu. Use Button variants instead of repeating palettes.

`StatusBadge.jsx` maps approved/active/completed states to emerald,
pending/review/expiring-soon states to amber, rejected/expired/failed states
to red, and neutral/unknown states to slate. Preserve these distinctions,
compact text, visible keyboard focus, accessible names, and loading feedback.

Pages compose components and feature hooks. Put API calls in services using
the shared client, workflow state/mutations in hooks, and validation in
schemas or pure helpers. `useFetch` returns `data`, `loading` (`isLoading`),
`error`, and `refetch` through TanStack Query. Examples include
`features/admin/hooks/useReferralsData.js`,
`features/admin/services/referralService.js`, and
`features/client/hooks/useClientIntake.js`.

## Backend responsibilities and validation

Views handle HTTP parsing, permissions, serializer validation, delegation,
and responses. Serializers own contracts/representations; services own
domain operations and persistence. Examples: `apps/admin_portal/serializers.py`,
`apps/caregivers/services.py`, `apps/clients/services.py`, and
`apps/documents/services.py` / `validators.py`.

Frontend schemas provide form feedback, not verified complete backend parity.
For public caregiver applications, consult `CaregiverApplyPublicSerializer`
in `apps/caregivers/serializers.py` and `submit_caregiver_application` in
`apps/caregivers/services.py`.

`apps/compliance/audit.py` filters logged payloads using a whitelist and
sensitive-key filtering. Logging catches failures and returns `None`; do not
claim every mutation or PHI read is durably audited. Application/agreement
services record content hashes; preserve their canonical inputs and historical
signatures.

For changes, verify route/API permissions, state/owner scope, loading, empty,
error, and keyboard behavior. Run frontend lint/build and affected browser
flows for UI changes. See [Python style commands and baseline policy](../docs/development/python-style.md).
