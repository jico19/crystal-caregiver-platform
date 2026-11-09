# Cleanup specifications

Status: Draft for implementation review. Created 2026-11-09 against `eb50f19`.

These specifications turn the [rules audit](../../plans/README.md) and
[cleanup proposal](../../plans/001-rules-cleanup.md) into requirements and
acceptance criteria. They specify proposed behavior; their presence does not
mean the changes have been implemented or verified.

| Spec | Priority | Audit findings | Dependency |
|---|---|---|---|
| [001 Public application account protection](001-public-application-account-protection.md) | P0 | F1 | None |
| [002 Referral refresh correctness](002-referral-refresh-correctness.md) | P1 | F2 | None |
| [003 Admin action boundaries](003-admin-action-boundaries.md) | P1 | F3 | None |
| [004 Shared compliance calculation](004-shared-compliance-calculation.md) | P1 | F4 | Policy decision before changing results |
| [005 Frontend workflow separation — Complete](005-frontend-workflow-separation.md) | P2 | F5, F6 | 002 before referral extraction |
| [006 Backend workflow services](006-backend-workflow-services.md) | P2 | F7 | Coordinate client/document services with 003 and 004 |
| [007 Style, UI consistency, and context](007-style-ui-consistency-and-context.md) | P3 | F8, F9, F10 | UI migration preferably follows 005 |

## Shared constraints

- Preserve existing routes, response shapes, state jurisdiction, role permissions,
  signature evidence, and storage access unless a spec explicitly changes them.
- Keep views responsible for HTTP handling and authorization, serializers for
  input validation and representation, and services for domain orchestration.
- Keep React pages focused on composition. Feature hooks own workflow state;
  services own transport; schemas own form validation. Small presentation state
  may remain local to components.
- Reuse existing React Hook Form, Zod, TanStack Query, Django, and DRF patterns.
  Avoid adding a framework, generic repository layer, or one-line CRUD wrappers.
- Use `tailwind-design-system` and `design-taste-frontend` when changing UI
  components. Preserve the current clinical portal identity and usable density.
- Follow AGENTS.md and PEP 8. Keep behavior and formatting changes reviewable
  as separate units.
- Use synthetic fixtures and local test storage. Never include real personal
  documents or credential values in fixtures, screenshots, or review notes.

## Delivery and validation

Deliver each spec, or each explicitly identified slice, as a focused change.
Start with 001 and 002. There is no requirement to finish the full cleanup before
shipping a verified slice. Recheck live files against the cited symbols before
implementation because the audit is a point-in-time snapshot.

Backend verification commands run from `backend/` in a configured virtual
environment. Frontend commands run from `frontend/`: `npm run lint` and
`npm run build` (`npm.cmd` on Windows when needed). Frontend lint's audit baseline
was exit 0 with four warnings. Build and backend tests were not run during the
audit. There is no configured frontend test script.

Run only relevant tests and browser flows for changed behavior. Skip tests for
documentation-only changes and use style checking for pure formatting. No full
suite, new broad testing framework, or dependency upgrade is a prerequisite.

Each delivered slice records which acceptance criteria were checked, the commands
and browser scenarios used, results, and remaining limitations. Open policy
decisions must be resolved before claiming the dependent criteria are complete.
