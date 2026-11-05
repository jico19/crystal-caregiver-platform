# Caregiver platform frontend

React 19, Vite, JavaScript/JSX, React Router, TanStack Query and Tailwind v4. Existing Radix primitives are retained; there is no replacement application or TypeScript migration.

## Development and checks

Run from frontend/ with the supported Node version (tested on Node 24):

```sh
npm install
npm run dev
npm test -- --run
npm test -- --run src/features/caregiver/documents
npm run test:watch
npm run lint
npm run build
```

On Windows PowerShell, use npm.cmd if script execution policy prevents npm. Vite serves port 5173 and proxies /api and /media to Django on port 8000. Keep environment files private. Do not seed or reset accounts for frontend verification.

Vitest discovers src/**/*.test.{js,jsx,mjs}. Pure logic defaults to Node; component suites use `// @vitest-environment jsdom`. Requests are mocked at transport boundaries with synthetic data; API/session tests run real Axios through its fetch adapter with a mocked network boundary. Tests override the API base URL and clean up queries, mocks and DOM. The four prior Node suites are migrated; deleted historical scripts are not verification commands. Backend tests remain pytest/pytest-django.

## Ownership

App.jsx retains provider composition; routes/AppRoutes.jsx retains URLs, lazy loading and guards. Workflow folders own supporting UI, data mapping, editor state and tests:

- features/admin/{authorizations,client-detail,dashboard,referrals,reports,website}
- features/caregiver/{application,dashboard,documents,training}
- features/client/{authorizations,dashboard,documents,forms,intake}

Other readable public, auth, account, roster and care pages retain their existing locations. Routes import migrated workflows directly; obsolete compatibility entry points were removed. Do not force a folder hierarchy onto every small page.

Use relative imports inside a workflow, @/shared/... for shared capabilities, and @/components/ui/... for primitives. Client care metrics remain at their existing explicit feature utility boundary. Do not reach into another workflow's internal editor or hook.

Keep server normalization separate from presentation and drafts. A mutation can refresh saved records without reinitializing another editor. Private sessions are keyed by account/state or record where appropriate. Preserve the application-to-login success transition; do not remount it merely because login succeeds.

## Shared boundaries

- shared/services/api.js wraps one configured Axios instance as the canonical application transport, including shared token refresh, ApiError, a 15-second timeout, cancellation and X-Agency-State. Its existing method signatures return parsed data (or blobs), so TanStack Query and component callers do not need Axios-specific response handling. Signed storage PUTs deliberately use native fetch with the protected URL directly through the shared document helper, without agency credentials.
- Preserve token storage keys, both auth profile endpoints, binary certificate downloads, signed form versions and existing role/state boundaries. Use role helpers; backend permissions remain authoritative.
- components/ui/ contains composable primitives; shared/components/common/ contains page compositions and feedback. Use the primitive Card pieces; the unused legacy composed Card was removed.
- shared/utils/ owns generic file, validation, draft-storage and packet helpers. Application schema/payload mapping lives in caregiver/application.

## Browser evidence

Temporary synthetic browser entry points were removed after verification. Behavioral fixtures remain in the colocated Vitest suites. Retained captures document frontend rendering only and do not prove backend persistence, permission enforcement or live delivery. See [RENOVATION.md](RENOVATION.md) for evidence and remaining acceptance checks.
