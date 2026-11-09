# 005: Keep frontend pages focused on composition

Status: Complete. Priority: P2. Audit findings: F5, F6.
Dependency: spec 002 before referral extraction.

## Problem and outcome

Referral, intake, authorization, and document pages combine rendering with
workflow state, validation, payload mapping, transport, and refresh handling.
Separate these responsibilities using the patterns already demonstrated by
caregiver ApplicationPage/useCaregiverApplication and admin/clientDetailService.

## Scope and proposed module ownership

| Slice | Existing pages | Target boundaries |
|---|---|---|
| Referrals | admin/pages/ReferralsPage.jsx | admin/hooks/useReferralsData.js, admin/services/referralService.js, feature toolbar/pipeline/table/dialog components |
| Intake | client/pages/IntakePage.jsx | client/hooks/useClientIntake.js, client/schemas/clientIntakeSchema.js, client/services/clientIntakeService.js, form/status components |
| Authorization | client/pages/AuthorizationsPage.jsx | client upload hook/schema/service, pure unit/hour helpers, upload and summary components |
| Documents | client/pages/DocumentsPage.jsx and caregiver/pages/DocumentsPage.jsx | shared upload hook/schema/service, feature-specific document presentation and query hooks |

All paths above are beneath `frontend/src/features/`, except shared upload modules
which belong beneath `frontend/src/shared/`. Exact authorization/helper filenames
may follow adjacent conventions; responsibility separation is the requirement.

## Requirements

- Pages compose components and call feature hooks; targeted pages contain no
  direct API-client imports, request payload builders, schema definitions, or
  workflow validation branches.
- Feature hooks own form/workflow state, derived domain values, mutation progress,
  error/success state, and refresh orchestration. Small disclosure/view state may
  remain in a leaf component.
- Services use the existing shared API client and own endpoint paths, request
  payload conversion, multipart creation, and transport-specific normalization.
- Schemas/pure validators own form constraints. Reuse Zod and React Hook Form
  rather than introducing another form library. Existing shared validators remain
  reusable; move definitions only when it clarifies ownership.
- Keep hooks organized by coherent workflow; moving all page code into one
  oversized hook does not satisfy the separation requirement.
- Preserve referral filters, state restrictions, pagination, search semantics,
  notes/confirmation behavior, and analytics refresh.
- Preserve intake defaults, draft/edit behavior, phone/date/signature constraints,
  null/empty payload mapping, messages, and successful refresh.
- Preserve authorization file/date requirements, submitted field names, upload
  reset behavior, and current unit/hour conversion and totals.
- Share document file/expiration validation and upload state. Preserve the current
  10 MB client validation and role-specific expiration requirements. This refactor
  must not change backend limits or merge role UIs behind many boolean flags.
- Use both required UI skills for component extraction. Retain accessible labels,
  error associations, focus behavior, and the existing portal appearance.

## Acceptance criteria

- [x] Each targeted page satisfies the composition boundary above.
- [x] Transport calls reside in feature/shared services; validation resides in
  schemas or focused shared validators.
- [x] The same synthetic valid input produces equivalent request method, path,
  field names, values, and empty/null behavior before and after extraction.
- [x] Invalid input prevents submission and preserves existing messages.
- [x] Server failures retain entered values and show appropriate errors.
- [x] Pending submission prevents accidental repeats; success performs the
  expected reset/close/refresh actions.
- [x] Shared upload logic is exercised through both client and caregiver pages,
  including required-expiration and invalid-file cases.
- [x] No new state/form framework or unrelated page redesign is introduced.

## Delivery and focused validation

Deliver referrals, intake, authorization, and documents as separate slices.
After each slice, run `npm run lint` and `npm run build`. Use focused browser
flows for valid submission, invalid input, server rejection, cancellation, and
successful refresh; compare narrow and desktop layouts for extracted components.

For intake, include signature retention and edit defaults. For authorizations,
include 15-minute units versus hours and date ordering. For documents, include
both roles, missing required expiry, past expiry, and the existing file-size
boundary. Do not require a broad frontend test-framework rollout to ship a slice.

## Completion record

Completed 2026-11-09. Delivered referrals, intake, authorizations, and both document
roles with separate hooks, schemas/validators, services, and presentation components.
The shared upload workflow preserves the existing 10 MB validation and role-specific
expiration behavior. Intake initialization now waits for its first profile response
so edit defaults are retained.

Lint and build passed after every slice. Final validation passed ten focused
contract-check groups, ninety browser assertions, and ten before/after request
contract comparisons. Desktop and narrow layouts were inspected. See the
[validation record and screenshots](../reviews/005-frontend-workflow-separation.md)
for scenarios, commands, and limitations.
