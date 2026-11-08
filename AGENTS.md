# AGENTS.md — Multi-State Caregiver Management Platform

## 1. Purpose and status

Build a **demonstrable, production-minded prototype** for a US home-care agency serving **Florida (FL), Indiana (IN), and Georgia (GA)**. The unified platform includes public state-specific pages, caregiver onboarding, client intake, and staff administration.

**Project status:** The agency has not yet confirmed its actual workflows, required fields, state-specific rules, third-party integrations, or operational policies. Implement credible **illustrative flows**, label assumptions clearly, and avoid presenting them as the agency's approved process. Prioritize a cohesive end-to-end demo over implementing every listed feature.

**Critical data rule:** Development, demos, tests, screenshots, and staging must use **synthetic data only**. Never accept or import actual patient data, Social Security numbers, driver's licenses, bank details, insurance documents, background checks, or other sensitive personal information until the owner approves the workflows and a separate security/privacy/compliance review is completed.

## 2. Agent operating instructions

1. Inspect the repository before changes. Preserve existing conventions, code, and working features when possible.
2. For each task, identify affected modules, implementation steps, security implications, and tests. Prefer small, reviewable changes.
3. Build **vertical slices**: Django models/permissions/API, then React screens, then integration tests. Avoid large unconnected scaffolds.
4. If a business decision is unknown, implement the simplest configurable demo behavior, note it under **Open Decisions**, and mark the relevant interface **Demo workflow — pending agency confirmation** where necessary.
5. Never invent actual Medicaid, licensure, HR, HIPAA, or FL/IN/GA legal requirements. Keep state-level document/training rules configurable and initially illustrative.
6. Do not hardcode credentials, secrets, personal information, or service-provider keys. Use environment variables and `.env.example` without live values.
7. Never add insecure shortcuts such as disabling CSRF, exposing upload folders publicly, wildcard credentialed CORS, trusting frontend role checks, or bypassing object-level permission checks.
8. Do not claim the application is HIPAA-compliant, legally binding for every e-signature use case, or production-ready merely because controls are implemented.
9. Do not send real SMS, emails, or external signature requests from demo data. Use local/test transports and clearly marked simulations.
10. Do not delete data or change schemas destructively without explanation and safe migrations. Run relevant tests and report what passed, what failed, and what remains unfinished.

### Coding principles (mandatory)

- **Prioritize simplicity and readability over complexity.** Prefer straightforward, explicit code. Avoid premature abstractions, unnecessary dependencies, and clever patterns that obscure intent.
- **One function, one responsibility.** Keep functions and methods focused on a single task; split unrelated behavior into clearly named units.
- **Avoid duplication of logic; extract shared helpers.** Reuse common validation, access checks, formatting, and utilities when the same behavior appears in multiple places. Do not abstract one-off code prematurely.
- **Services hold business rules; one service per domain.** Put workflows and state transitions in focused domain services (e.g., caregiver onboarding, client intake, document review). Keep views thin, serializers focused on validation/representation, and models responsible for data integrity. A domain service may expose multiple functions; don't create a new service for every endpoint.
- **Follow Django and DRF best practices.** Use the ORM, migrations, transactions for multi-step writes, model constraints, queryset scoping, DRF permissions, serializers, and standard settings patterns. Prefer built-in Django capabilities over custom replacements.

### Django implementation standards (mandatory)

**Core Django**

- Create a custom `User` extending `AbstractUser` **before the first migration**; configure `AUTH_USER_MODEL` immediately.
- Split settings into `config/settings/base.py`, `dev.py`, and `prod.py`; load secrets and deployment configuration from environment variables, never source control.
- Keep Django apps small and domain-focused. Models own schema/invariants and simple model behavior; **domain services own workflows/business rules**; views remain thin and serializers handle API input/output validation.
- Use migrations for every schema change. Never rewrite a migration already applied in a shared environment; squash only after dependent deployments are safely migrated.
- Enforce data integrity with database-level `UniqueConstraint`, `CheckConstraint`, `db_index`, and appropriate field uniqueness—not application validation alone.
- Prevent N+1 queries with `select_related()` for FK/one-to-one and `prefetch_related()` for reverse/M2M relations. Verify costly queries with `assertNumQueries` or `django-debug-toolbar` in development.
- Use `F()`/`Q()` expressions, `bulk_create()`/`bulk_update()`, and `.only()`/`.values()` when they make queries correct or measurably more efficient. Favor readable ORM code; optimize observed bottlenecks.
- Use `transaction.atomic()` for related multi-record writes; schedule external effects after commit with `transaction.on_commit()` when appropriate.
- Prefer `pytest-django` with `factory_boy` factories for isolated tests instead of brittle, shared static fixtures. Include negative permission and state-isolation tests.
- Before deploying, use `DEBUG=False`, correctly set `ALLOWED_HOSTS`, configure HTTPS/secure cookies and proxy settings, and run `python manage.py check --deploy` against production settings.

**Django REST Framework**

- Prefer `ModelViewSet` with routers for standard CRUD; use DRF generics or `APIView` for genuinely custom operations. Don't force a viewset onto every workflow.
- Use explicit serializers, splitting read/write serializers via `get_serializer_class()` when their fields or permissions differ. Validate input in `validate_<field>()` / `validate()`; keep business state transitions in services.
- Override `get_queryset()` to enforce ownership, agency membership, and FL/IN/GA branch visibility **before** applying `select_related()` / `prefetch_related()`. Also authorize object actions, creates, exports, and file downloads.
- Set secure `REST_FRAMEWORK` defaults: `SessionAuthentication`, `IsAuthenticated`, pagination, throttling, and filter backends. Mark deliberately public endpoints with explicit permissions; throttling complements, not replaces, infrastructure rate limiting.
- Paginate all list endpoints, including report-detail lists. Use `django-filter` for supported filters instead of custom query-string parsing.
- Use focused custom `BasePermission` classes for role/object checks; remember object permissions do not automatically filter list querysets or enforce create permissions.
- Version endpoints at `/api/v1/`; standardize error responses through a custom exception handler without leaking sensitive information.
- Explicitly enumerate serializer `fields` (never `__all__`) to avoid accidental disclosure of new model fields.
- **Keep Django sessions + HttpOnly cookies for this React browser client.** Do not introduce JWT or token auth solely because DRF is an API; revisit token-based auth only if a separately authenticated mobile or external client requires it.

**Production operations**

- Run Django under Gunicorn (WSGI) or an appropriate Uvicorn/ASGI server, behind the platform's HTTPS ingress/reverse proxy. A separate Nginx layer is optional on Fly.io, not a default requirement. Use PostgreSQL, not SQLite, in production.
- Keep expensive email, SMS, document processing, and report generation out of request handlers. Start with the prototype's simulated outbox; adopt Celery or a comparable worker/queue when real asynchronous workloads require it, with idempotent jobs.
- Add Redis caching only when justified by measured needs or a chosen job queue. Use structured, privacy-safe logs and an error-monitoring service such as Sentry only with sensitive-data scrubbing and vendor compliance review.

### React implementation standards (mandatory)

**Components and structure**

- Use **TypeScript**, function components, and hooks; avoid new class components and `any`. Define explicit prop and API response types.
- Keep components small, readable, and single-purpose. Prefer composition (`children` and focused reusable components) over deep prop drilling; colocate code **by feature**, not just file type.
- Name components `PascalCase` and hooks `useX`. Extract repeated UI or behavior only when it genuinely improves clarity.

**State, server data, and forms**

- Keep state local; lift it only when multiple components need to share it. Calculate derived values during render rather than duplicating them in state or synchronizing them with effects.
- Use `useReducer` for related/complex transitions, Context for infrequently changing app-wide state (such as authenticated user or theme), and introduce Zustand/Redux Toolkit **only** if shared state becomes difficult to manage.
- Use **TanStack Query** for server state, caching, request status, and invalidation; use the shared **Axios** client for requests, cookies, and CSRF. Do not duplicate fetched API data in global client state without a clear need.
- Use **React Hook Form + Zod** for nontrivial forms and consistent validation. Use controlled inputs where necessary for validation/interaction; prefer simpler uncontrolled inputs when sufficient. Backend validation remains authoritative.

**Hooks, effects, and performance**

- Follow the Rules of Hooks; enable `eslint-plugin-react-hooks` and address `exhaustive-deps` warnings rather than disabling the rule.
- Use `useEffect` to synchronize with **external systems**, not to transform data or handle events. Clean up subscriptions, listeners, timers, and pending network work (e.g., via abort signals) when appropriate.
- Extract repeated stateful behavior into custom hooks. Use stable, unique keys for dynamic lists—never array indexes when items can move or change.
- Profile before optimizing with `memo`, `useMemo`, or `useCallback`. Avoid unnecessary inline object/function props to memoized children when referential stability matters.
- Lazy-load routes and genuinely heavy components using `React.lazy` and `Suspense`; virtualize very long lists with `@tanstack/virtual` or `react-window` only when needed.

**Quality, accessibility, and safety**

- Test user-visible behavior using **React Testing Library**; query by role/accessible label instead of component internals. Include loading, failure, empty, permission-denied, and form-validation states.
- Add error boundaries around major page or application sections. Use semantic HTML and accessible labels; enable `eslint-plugin-jsx-a11y`, adding ARIA only when native semantics are insufficient.
- Never render unsanitized user-supplied HTML with `dangerouslySetInnerHTML`. Treat caregiver/client form and document metadata as untrusted input.
- Frontend route guards and hidden controls are **UX only**; the Django backend must enforce every permission, ownership rule, and FL/IN/GA branch boundary.

## 3. Selected technology

- **Frontend:** React + Vite + TypeScript, React Router, Axios, TanStack Query, React Hook Form + Zod.
- **UI:** TailwindCSS
- **Backend:** Django + Django REST Framework (DRF), feature-based Django apps.
- **Authentication:** Django server-side sessions, secure HttpOnly session cookie, DRF `SessionAuthentication`, CSRF protection.
- **Database:** SQLite for local development; PostgreSQL in production. Prefer PostgreSQL in local integration tests when feasible to catch database differences.
- **Deployment target:** Fly.io for backend, subject to hosting/security/commercial suitability review; deployment is not authorization to process real PHI.
- **Media storage:** Local private fake-document storage in development; private durable object storage in production with access controlled through backend-authorized retrieval. Never assume Fly.io's container filesystem is persistent storage.
- **Notifications:** Swappable email/SMS service interfaces; console or in-memory email backend and recorded fake SMS in demo mode.
- **Background jobs:** Start with a management command plus a demonstrable manual trigger; introduce a scheduler/worker when a recurring job is actually needed.
- **Documentation/testing:** API contracts, Django/DRF tests, React Testing Library, and at least one critical end-to-end demo test.

Do not add Firebase Auth, Supabase Auth, JWT/localStorage auth, microservices, or a complex event bus without a documented reason and approval.

## 4. Suggested repository layout

Use existing structure where present. Suggested new-repository layout:

```text
/
├── AGENTS.md
├── README.md
├── docs/
│   ├── prototype-scope.md
│   ├── open-decisions.md
│   ├── architecture.md
│   └── security-checklist.md
├── backend/
│   ├── config/               # settings, root URLs, WSGI/ASGI
│   ├── apps/
│   │   ├── accounts/         # custom user, auth, role/state membership
│   │   ├── locations/        # FL/IN/GA configurations, public content
│   │   ├── caregivers/       # applications, profile, onboarding
│   │   ├── clients/          # intake, client profile, care plan
│   │   ├── documents/        # requirements, document metadata/review
│   │   ├── training/         # courses, assignments, completion
│   │   ├── authorizations/   # client authorization status/history
│   │   ├── notifications/    # templates, outbox, notification adapters
│   │   ├── signatures/       # demo consent/signature records
│   │   ├── auditing/         # access and business-event logs
│   │   └── reporting/        # state-scoped dashboard summaries
│   ├── tests/
│   └── manage.py
└── frontend/
    └── src/
        ├── app/             # routing, providers, layouts
        ├── api/             # axios instance and API clients
        ├── components/      # reusable UI components
        ├── features/        # auth, caregiver, client, staff, state
        └── pages/
```

Keep business logic in services or domain functions, not React components or oversized Django views. Prefer explicit serializers and queryset scoping rather than implicit magic.

## 5. Domain and access model

### Agency/state structure

- Model one parent **Agency** with three **StateBranches** (`FL`, `IN`, `GA`). State is an access boundary and business configuration, not merely a frontend filter.
- A user may be associated with more than one branch through an explicit **Membership** with role, branch, and active status.
- Caregivers may be eligible for multiple branches; clients/intakes belong to an explicit branch. The exact cross-branch business rules are pending agency confirmation.
- All state-sensitive records must have an unambiguous agency/branch scope. For records covering more than one branch, define an explicit access policy rather than guessing.

### Prototype roles

| Role | Initial permissions |
| --- | --- |
| Visitor | View public pages; submit demo caregiver application or client inquiry/intake |
| Caregiver | View/update own profile, own onboarding requirements/documents, assigned trainings |
| Client | View own intake, documents, authorizations, care-plan and schedule placeholders |
| Staff | Review/manage records assigned to their authorized branch(es) |
| Agency admin | Manage permitted records across all branches and view cross-state reporting |

Use **role-based access control plus record ownership and branch-scoped authorization**. Authentication alone never grants access to client, caregiver, document, training, or report records. Implement default-deny querysets and explicit object checks on retrieve/update/delete/custom actions. Do not use `is_staff` as the full business authorization model.

### Suggested initial models

- `User` (custom Django user model created before first migration, email-based login, active/verified flags)
- `Agency`, `StateBranch`, `Membership`
- `CaregiverProfile`, `CaregiverApplication`, `OnboardingChecklistItem`
- `ClientProfile`, `ClientIntake`, `CarePlanSummary`, `ServiceScheduleEntry` (demo data only)
- `DocumentRequirement`, `DocumentRecord` (metadata, branch, owner, type, status, expiration date, private storage key)
- `TrainingCourse`, `TrainingAssignment`, `TrainingCompletion`
- `ClientAuthorization` (issuer/type, status, valid dates, history)
- `NotificationTemplate`, `NotificationOutbox`
- `SignatureEvent` (demonstration only, associated document version/consent)
- `AuditEvent` (actor, action, resource type/ID, branch, timestamp, safe metadata)

Use migrations, indexes for commonly filtered fields, time-zone-aware timestamps, choices/enums for statuses, and appropriate DB constraints. Prefer stable UUID public identifiers and avoid sequential ID assumptions for access control. Do not store SSNs, bank-account numbers, raw credentials, or actual medical records in demo fixtures.

## 6. Authentication and authorization requirements

- Use Django's session authentication for the browser application. Store sessions server-side. Session cookies must be `HttpOnly`, `Secure` in HTTPS environments, and appropriately `SameSite` scoped.
- CSRF remains **enabled** for login, logout, and all state-changing API requests. Supply a CSRF bootstrap endpoint, send `X-CSRFToken` in Axios, and use `withCredentials: true` where needed. Refresh CSRF token after login when appropriate.
- Prefer same-site deployment under one parent domain for the frontend/API, e.g. `app.example.com` and `api.example.com`; design exact cookie, CORS, and CSRF trusted-origin settings once real domains are decided. For local Vite development use a documented development proxy or strictly allowed origins.
- Never set `CORS_ALLOW_ALL_ORIGINS=True` alongside credentials. Never use `csrf_exempt` as a workaround for React integration. Never put auth tokens or passwords in localStorage.
- Provide login, logout, current-user/session, CSRF bootstrap, and password-reset flows. Protect public registration and password-reset endpoints with validation and rate limits. Never return plaintext passwords.
- For privileged staff/admin accounts, plan MFA (TOTP or passkeys) before production. In the demo, indicate MFA as a deployment gate if not implemented.
- Staff accounts should be provisioned/invited by an admin; visitors must never self-register as staff/admin. Server must validate branch memberships for every action.
- Configure safe session expiry, password hashing (Argon2 where available), account recovery, secure headers, and audit of sign-ins/security events.

## 7. Functional prototype scope

### Public site — three state views

- One consistent agency website with a prominent FL / IN / GA switcher.
- Branch landing pages show illustrative services, contact details placeholders, application/intake entry points, and editable state-specific content.
- State-specific forms/requirements are configuration-driven; distinguish hypothetical content from verified agency instructions.
- Public forms show clear success/confirmation screens and create reviewable demo records.

### Caregiver portal

- Registration or invitation path for caregivers, editable profile, and application progress.
- Guided onboarding checklist with document type, required/optional status, expiration date, upload/review status, and rejection feedback.
- Secure fake-document upload and authorized download/preview; no public media URLs.
- Dashboard sections: pending, missing, expiring soon, expired, approved documents; assigned training, course completion, announcements.
- Demo training assignment and completion with downloadable **sample** completion certificate if useful. Never imply a demo certificate is a recognized credential.

### Client portal

- Demonstrate intake submission, review status, sample uploaded documents, authorization status/history, and future expiration.
- Provide a clearly labeled sample care plan and mock schedule. Do not invent real clinical orders or medical advice.
- Render a consent/signature demonstration with signer attribution and document version, but do not claim legal equivalence to a production e-sign provider.
- Secure messaging is **out of initial MVP** unless explicitly requested later.

### Staff/admin portal

- Branch-aware work queues for applications, referrals, caregiver credentials, trainings, and client authorizations.
- Approve/reject with comment and timestamp where appropriate; record audited status changes.
- Dashboard cards and filterable tables for missing/expiring/expired credentials, overdue training, pending intake, expiring authorizations.
- Cross-state summary is admin-only; branch-limited staff see only their permitted branches.
- Provide synthetic seeded records to illustrate realistic workflows.

### Demo automation

- Compute expiration statuses from stored dates using the application time zone, with a configurable reminder window (demo default 30 days).
- Create internal notification/outbox records for expiring caregiver documents, expiring authorizations, overdue training, new referrals, and successful uploads.
- Offer a manual `send_demo_reminders` command or staff-only demo trigger; it records notifications instead of sending real SMS/emails.
- Make outbox jobs idempotent and avoid duplicate reminders per subject/event/window.

## 8. Business workflows (provisional)

All flows below are **illustrative pending agency confirmation**.

- **Caregiver:** application submitted → under review → approved/rejected → onboarding in progress → eligible/active (eligibility rules pending).
- **Documents:** required → uploaded → pending review → approved/rejected → expiring/expired (expiration does not silently overwrite review history).
- **Client:** inquiry/intake submitted → under review → admitted/declined → active (actual admission requirements pending).
- **Authorization:** submitted → under review → active/denied → expiring/expired.
- **Training:** assigned → in progress → completed/overdue.

Enforce transitions in backend services with permission checks and audit events; keep status histories rather than treating every state as an editable free-text field.

## 9. API conventions

Version APIs under `/api/v1/`, use consistent paginated JSON responses, explicit serializer validation, predictable errors, and generated OpenAPI documentation.

Suggested endpoints (not a mandate to create all immediately):

```text
GET    /api/v1/auth/csrf/
POST   /api/v1/auth/login/
POST   /api/v1/auth/logout/
GET    /api/v1/auth/me/
GET    /api/v1/branches/
POST   /api/v1/caregiver-applications/
GET    /api/v1/caregiver/me/
GET    /api/v1/caregiver/documents/
POST   /api/v1/caregiver/documents/
GET    /api/v1/caregiver/trainings/
POST   /api/v1/client-intakes/
GET    /api/v1/client/me/
GET    /api/v1/client/authorizations/
GET    /api/v1/staff/applications/
POST   /api/v1/staff/applications/{id}/review/
GET    /api/v1/staff/reports/compliance/
GET    /api/v1/staff/notifications/
```

Never rely on a supplied `branch_id`, `user_id`, or document ID without authorizing it against `request.user`. Use scoped querysets plus permissions for both list and detail routes. Ensure export/report endpoints enforce identical scoping.

## 10. Privacy, security, and deployment gates

**Prototype is not a HIPAA compliance certification.** Whether HIPAA applies, the agency's responsibilities, provider suitability, and any required Business Associate Agreements (BAAs) must be assessed before processing real client information.

Mandatory engineering practices:

- HTTPS in nonlocal environments; secure session and CSRF settings; exact allowed hosts/origins; no insecure production debug mode.
- Least privilege and branch-based record isolation on **all** read/write/export/file actions, including aggregates.
- Private upload storage, random internal storage keys, allowed file types, maximum sizes, server-side content validation, malware scanning plan, controlled downloads, and no indexing of sensitive media.
- Retain only necessary metadata; redact sensitive payloads in logs, traces, exceptions, emails, and test output.
- Log login, review/approval, document access/download, changes to sensitive records, and authorization failures where appropriate, while minimizing sensitive audit detail. Make audit events append-only at application level.
- Design backups, restore drills, encryption/key management, retention/deletion rules, incident response, access reviews, and activity monitoring before live use.
- Verify hosting, database, object storage, messaging, analytics, logging, and email vendors against actual privacy/compliance obligations, and obtain applicable BAAs **before** sending PHI to them.
- Avoid including PHI or sensitive documents in email/SMS body. Send generic notifications directing users to authenticated portal views.
- Never promote demo/staging containing fake data to a live patient system without a separate production readiness assessment.
- For Fly.io, use durable managed Postgres and external private object storage. Container runtime disk is not a safe document repository. Review operating cost, availability, backups, and vendor terms.

## 11. Delivery phases and acceptance criteria

### Phase 0 — Foundation (build first)

- [ ] Inspect repo and write `docs/prototype-scope.md` plus `docs/open-decisions.md`.
- [ ] Set up React/Vite and Django/DRF with local dev commands, `.env.example`, lint/test scripts.
- [ ] Create custom user **before initial migrations**, agency, branch, membership, and seed commands.
- [ ] Implement protected session login/logout/current-user/CSRF flow and sample role-based routes.
- [ ] Build public home page, branch switcher, caregiver/client/staff dashboard shells.
- [ ] Seed at least one synthetic user for each role and FL/IN/GA branch records.
- [ ] Test unauthorized access, role escalation attempts, and wrong-branch access.

**Definition of done:** A reviewer can run the project locally, sign into distinct demo accounts, switch branches, and see correctly limited records without using real personal data.

### Phase 1 — Caregiver onboarding (first meaningful end-to-end slice)

- [ ] Submit caregiver application and view its status.
- [ ] Display configured onboarding checklist with fake sample document upload.
- [ ] Staff reviews and accepts/rejects submitted document, recording an audit event.
- [ ] Dashboard reflects missing/expiring/approved statuses.
- [ ] Wrong caregiver and wrong-branch staff cannot access uploaded files or records.

**Definition of done:** Show application → document submission → review → updated dashboard in one demo, with access-denial tests.

### Phase 2 — Client intake and authorization

- [ ] Submit synthetic intake and staff review.
- [ ] View fictional care-plan/schedule placeholders, private fake documents, and authorization status.
- [ ] Trigger an illustrative upcoming-authorization-expiration item.
- [ ] Verify client-to-client and state separation.

### Phase 3 — Training, notifications, and reporting

- [ ] Assign demo training, mark progress/completion, show overdue state.
- [ ] Generate idempotent demo reminders in an outbox; no real sends.
- [ ] Add branch-scoped staff dashboard analytics and filterable reports.
- [ ] Add at least one full frontend/browser integration test for a core workflow.

### Phase 4 — Client review before real-world implementation

- [ ] Walk through prototype with agency; confirm workflow ownership and actual required document lists by state.
- [ ] Confirm approval hierarchy, staff roles, credential validity, intake/admission rules, and legal/vendor obligations.
- [ ] Replace temporary demonstration logic only after receiving approved requirements.
- [ ] Complete privacy, security, vendor, BAA, backup/recovery, and deployment assessments before accepting real sensitive data.

## 12. Test expectations

Test at minimum:

1. Anonymous users cannot access private records.
2. Caregiver A cannot list, retrieve, mutate, or download Caregiver B's files.
3. Client A cannot access Client B's intake, authorizations, or care-plan content.
4. FL-only staff cannot access IN or GA records, including via guessed UUIDs or exported reports.
5. Agency admin can access cross-branch data only as explicitly permitted.
6. A forged `role`, `owner_id`, or `branch_id` request does not escalate privileges.
7. Unsafe API methods require valid CSRF with authenticated session flows.
8. Document status transitions require authorized reviewers; audit events are recorded.
9. Expiration/reminder calculations respect dates, timezone, and deduplication.
10. Invalid file type/size and unauthorized file download are rejected.
11. No real contacts or third-party notification sends occur in demo/test mode.

Do not mark work complete when security-sensitive tests fail. Report limitations explicitly.

## 13. Open decisions — ask agency before production

Keep `docs/open-decisions.md` updated with questions, assumptions, owners, and status. Initial questions:

- Are FL, IN, and GA one legal agency, different licensed entities, or separate brands/domains? Who can cross state boundaries?
- What are the official caregiver application, vetting, onboarding, and approval steps for each state?
- Which credentials are required for each role/branch, what are their validity periods, and who verifies them?
- Who can create client records, consent on their behalf, and see their medical/care information?
- What are the actual intake, admission, referral, authorization, and discharge flows?
- What training provider/content, certificate rules, and annual requirements apply?
- Which exact electronic signature, email, SMS, file storage, and scheduling vendors are approved?
- What data retention, access logs, incident response, export, and deletion policies apply?
- Will the agency obtain BAAs where required, and which systems are approved for real PHI?
- Which production domains, budget, operations owner, and support expectations are approved?

Do not block prototype progress on unresolved questions. Surface assumptions visibly and avoid inventing a definitive business rule.

## 14. First agent task

Start with **Phase 0 only**. Inspect the repository and implement the smallest usable, testable foundation: custom user + membership/branch models, session/CSRF authentication, synthetic demo seeds, branch-scoped permissions, protected React routes, and public FL/IN/GA switcher. Write run instructions and document decisions. **Do not attempt the full scope in a single generation.**
