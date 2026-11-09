# Codebase rules audit and cleanup proposal

Audited 2026-11-09 at commit `eb50f19`, including the uncommitted AGENTS.md rules.
Status: PROPOSED. No implementation changes were made during the audit.

## Verdict

The codebase partially follows the new rules. Shared components, Tailwind v4
tokens, feature hooks, Zod validation, and some backend services already exist.
The main gap is inconsistent responsibility separation, rather than a need for
another framework or a rewrite.

## Scope and evidence limits

- Inventoried 107 tracked non-migration Python files, 141 frontend JS/JSX files,
  and 43 frontend page files. Read representative shared modules and workflow
  hotspots; this was not a line-by-line review of every file.
- 16 page files import the shared API client. This is a review signal, not proof
  that each import requires a separate wrapper.
- Read backend permission, serializer, service, view, and related test code for
  the cited workflows. Findings below are confirmed by static inspection;
  no production requests or exploit attempts were made.
- Ran `npm.cmd run lint` in `frontend/`: exit 0, four warnings. Warnings concern
  component exports in tabs/button/badge and Date usage in PublicLayout.
- Did not run tests or build: no application code changed. Did not install tools.
  Ruff and pycodestyle are unavailable in the current Python environment.
- Did not audit deployment, database behavior, dependency advisories, all security
  boundaries, or rendered visual/accessibility behavior.
- Skill usage is a workflow requirement: historical use of either UI skill cannot
  be proved from source. Token/component consistency can be assessed statically;
  full visual compliance needs a browser review when UI changes are made.

## Compliance by rule

| New rule | Assessment | Evidence |
|---|---|---|
| Readability, maintainability, simplicity | Partial | ReferralsPage.jsx is 799 physical lines and owns querying, filtering, mutation orchestration, and multiple UI presentations. Size alone is not the finding. |
| Use both UI skills | Historical usage unverifiable; design system adoption partial | index.css defines semantic tokens, but button.jsx and input.jsx use direct palette classes, and ConfirmModal repeats the primary button appearance. |
| Separate backend Views, Serializers, Services | Partial | Public caregiver application delegates to a serializer and service. Admin review/admission and client agreement signing still implement workflows inside views. |
| PEP 8 | Partial | Missing top-level blank lines, misplaced module imports, and long lines remain; no committed Python lint configuration was found. |
| React pages compose components | Partial | ApplicationPage delegates to a hook and components; referrals, intake, authorization uploads, and document uploads retain substantial workflow logic. |
| Test only relevant functionality | Not historically verifiable | Focused Django tests are available; frontend has no test script. This audit ran only read-only lint and static analysis. |

## Vetted findings

All findings have HIGH confidence in the cited code patterns. Production impact
has not been measured. Effort: S = hours, M = about a day, L = multiple days.

| ID | Priority | Finding and impact | Evidence | Effort | Fix risk |
|---|---|---|---|---|---|
| F1 | P0 | Anonymous caregiver submission can change an existing account's password, role, state, and status. This is an account-integrity defect discovered alongside the rules audit. | backend/apps/caregivers/views.py:17; serializers.py:59; services.py:33 and :41 | S-M | Medium: preserve new-user signup and handle existing identities safely. |
| F2 | P1 | Referral writes can persist and then display failure because reloadAnalytics is undefined. | frontend/src/features/admin/pages/ReferralsPage.jsx:121, :159, :174, :205; frontend/src/shared/hooks/useFetch.js:49 | S | Low: use the existing hook contract. |
| F3 | P1 | Admin admission reads raw status/date inputs and persists them without an action serializer; application review also mixes validation, mutation, and auditing. | backend/apps/admin_portal/views.py:197 and :333 | M per workflow | Medium: preserve authorization, response contracts, and audit fields. |
| F4 | P1 | Compliance rules are duplicated and disagree: caregiver includes expiring-soon approved documents as satisfying requirements, client does not, admin ignores expiration. This disagreement may include intentional role policy. | backend/apps/caregivers/views.py:111 and :123; backend/apps/documents/views.py:107 and :124; backend/apps/admin_portal/views.py:249 | M | High: agree policy before changing results. |
| F5 | P2 | React pages retain form state, validation, payload mapping, requests, and refresh orchestration, making isolated changes harder. | frontend/src/features/admin/pages/ReferralsPage.jsx:100; frontend/src/features/client/pages/IntakePage.jsx:98 and :130; AuthorizationsPage.jsx:54 and :100 | M per feature | Medium: preserve form defaults, validation messages, signatures, and refresh behavior. |
| F6 | P2 | Client and caregiver document pages repeat upload state and validation despite an existing shared upload helper. | frontend/src/features/client/pages/DocumentsPage.jsx:50 and :101; frontend/src/features/caregiver/pages/DocumentsPage.jsx:48 and :84; frontend/src/shared/utils/documentUtils.js:14 | M | Medium: retain role-specific queries and expiration rules. |
| F7 | P2 | Intake, agreement hashing/versioning, and document storage orchestration remain inside views. | backend/apps/clients/views.py:41 and :94; backend/apps/documents/views.py:52 and :237 | L, split by workflow | Medium-high: signatures, audit history, and storage behavior are sensitive. |
| F8 | P3 | Python style is inconsistent and has no repeatable checker. Static scan found 102 lines over 119 characters across 20 non-migration Python files; this is a lower-bound signal, not a full PEP 8 report. | backend/apps/caregivers/services.py:11; backend/apps/clients/serializers.py:7; backend/apps/documents/views.py:154; backend/apps/training/services.py:27 | S setup, incremental fixes | Low when formatting is separated from behavior changes. |
| F9 | P3 | Tokens and shared primitives are bypassed or restyled redundantly. | frontend/src/index.css:3 and :63; frontend/src/components/ui/button.jsx:13; input.jsx:11; frontend/src/shared/components/common/ConfirmModal.jsx:48; frontend/src/features/admin/pages/ReferralsPage.jsx:339 | M | Medium: styles and focus appearance need visual comparison. |
| F10 | P3 | Frontend context describes a FastAPI/SQLAlchemy backend that does not match the Django implementation, and validation comments point to absent Pydantic schemas. This can steer future cleanup incorrectly. | frontend/CONTEXT.md:12; frontend/src/shared/utils/validation.js:19; backend/config/urls.py:18 | S | Low: verify facts against current files. |

PEP 8 expects grouped module imports, two blank lines around top-level definitions,
and normally 79-character code lines. Use the official guide as the standard:
https://peps.python.org/pep-0008/ . Do not adopt 119 characters as the desired limit.

## Proposed execution order

The detailed proposal is [001-rules-cleanup.md](001-rules-cleanup.md).

| Batch | Scope | Depends on | Status |
|---|---|---|---|
| A | F1 account-integrity fix | None | PROPOSED |
| B | F2 referral refresh fix | None | PROPOSED |
| C | F3 action serializers and services | None; characterize each workflow before extraction | PROPOSED |
| D | F4 compliance policy and shared calculation | Policy decision and focused characterization tests | PROPOSED |
| E | F5/F6 frontend extraction, one feature per change | B before referrals extraction | PROPOSED |
| F | F7 individual backend workflow services | Characterization tests for each workflow | PROPOSED |
| G | F8/F9/F10 style enforcement, UI consistency, context corrections | UI work should follow feature extraction where practical | PROPOSED |

Start with A and B, then C. Do not combine all batches into one pull request.
F8 and F10 can proceed independently in small documentation/tooling changes.

## Useful existing patterns

- frontend/src/features/caregiver/pages/ApplicationPage.jsx:20 delegates its
  workflow to useCaregiverApplication and composes feature components.
- frontend/src/shared/utils/validation.js:21 already contains a Zod application
  schema. The absence of schema-named files does not mean schemas are absent.
- frontend/src/features/admin/services/clientDetailService.js:3 provides a
  feature-level transport boundary with deliberate handling of missing resources.
- backend/apps/caregivers/services.py:21 shows an atomic operation boundary, but
  its account-update policy needs F1 fixed before copying its behavior.

## Considered and rejected

- A service wrapper around every ModelSerializer.save(): adds indirection without
  value for simple CRUD. Extract business rules and operations with side effects.
- Moving every useState out of components: local presentation state can stay in
  a leaf component. Form/workflow state belongs in feature hooks.
- Calling every palette utility a design defect: deliberate status colors are
  appropriate. Prioritize brand, surface, border, focus, and shared variants.
- Inferring bad readability solely from line count: findings require mixed
  responsibilities or duplication as well as size.
- A whole-repo formatter run, new state framework, or broad frontend test stack
  as a prerequisite: excessive scope for the proposed cleanup.
- Treating all compliance differences as bugs: policy intent remains unverified.
