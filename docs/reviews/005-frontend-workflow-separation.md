# 005 frontend workflow separation validation

Completed 2026-11-09. All five targeted pages now compose feature hooks and
presentation components. Services own endpoint paths, query serialization,
payload normalization, and multipart/storage transport. Zod schemas and the
existing file/phone validators own workflow validation; React Hook Form owns
form values. No dependencies were added.

## Delivered boundaries

| Slice | Workflow and query ownership | Presentation |
| --- | --- | --- |
| Referrals | `useReferralsData`, `useReferralActions`, `referralService` | Metrics, toolbar, pipeline, table, and dialogs |
| Intake | `useClientIntakeData`, `useClientIntake`, `clientIntakeSchema`, `clientIntakeService` | Progress, saved profile/packet, and intake form |
| Authorization | `useAuthorizationsData`, `useAuthorizationUpload`, `authorizationUploadSchema`, `authorizationService`, pure `authorizationUnits` helpers | Summary, upload form, and records |
| Documents | Role-specific `useClientDocuments` / `useCaregiverDocuments`, shared `useDocumentUpload`, `documentUploadSchema`, and `documentService`; client compliance loader in `clientDocumentService` | Separate client and caregiver upload/record components, plus client compliance status |

The existing query helpers accept optional service loaders while retaining their
query keys, pagination, retry, and cache behavior. Existing document utility
imports re-export the shared service, preserving other callers.

Each mutation guards pending writes. Notes saves now disable Save Notes while
pending. Caregiver upload labels now use FormField's supported `htmlFor` prop.

The intake edit-default check exposed an existing first-load race: the nullable
query placeholder could render the form before the profile response, capturing
empty defaults. Intake now waits for that first response before mounting its
form hook. Later refreshes and edit cancellation retain drafts and drawn
signatures. Native required controls and existing validation messages remain.

## Validation

`npm.cmd run lint` and `npm.cmd run build` passed after each slice and at final
validation. Lint reports the same four existing warnings in `badge.jsx`,
`button.jsx`, `tabs.jsx`, and `PublicLayout.jsx`; none concern the extracted code.
`git diff --check -- frontend` passed.

Run the retained focused checks from `frontend/`:

```sh
node scripts/verify-workflow-contracts.mjs
```

All ten grouped checks passed. They cover defaults, exact validation messages,
trim/null mapping, multipart fields and omitted notes, required/optional expiry,
file extensions and the exact 10 MiB boundary, unit/hour conversion, server
overrides, zero/null/over-limit balances, and service paths/methods/auth arguments.
They use Node assertions and the existing Vite loader; no test framework or
backend connection is required.

Browser validation used the actual local Vite app, an isolated agent-browser
session, synthetic users, 45 synthetic referrals, synthetic documents, and
controlled fetch responses. The same flows also ran against copies of the five
pages saved before extraction. Ninety post-refactor browser assertions passed.
Ten captured mutation/storage request contracts matched before and after,
including method, path, fields, values, whitespace, and null/omission behavior.
The captured contracts are in [request-contracts.json](005-frontend-workflow-separation/request-contracts.json).
Each intake run separately verified that the submitted signature equaled its
drawn canvas image; the saved comparison replaces that image with a marker.

| Slice | Browser results |
| --- | --- |
| Referrals (26 assertions) | Case-insensitive, trimmed search stays local to the current page. Status and notes writes retain Florida, page 2, and page size 20 and refresh both list and analytics. Rejected notes retain the draft/dialog; rejected status leaves data unchanged. Pending notes block repeat writes. Conversion waits for confirmation, cancels without a write, and closes/refreshes after success. A successful write followed by rejected refreshes retains success beside the query error. State administrators see only Florida; pipeline movement, page-size reset, stage/unassigned filters, and filter reset preserve scope. |
| Intake (17 assertions) | Saved profile and signer defaults load. Missing signature, blank signer, future birth date, invalid phone, and Medicaid IDs over 50 characters prevent submission with existing messages. Server rejection retains values and the drawn signature. Pending submission blocks repeats. Success trims fields, maps empty address/Medicaid to null, refreshes the profile, closes editing, and retains the signature for another edit. Cancellation retains the draft. |
| Authorization (14 assertions) | Mixed quarter-hour/hour authorizations total 35.0 authorized, 8.0 used, and 27.0 remaining hours with 87 remaining units. Reversed dates, invalid extensions, and oversized files prevent upload. Server rejection retains dates, notes, and file. Pending submission blocks repeats. Success posts the existing multipart fields, closes/resets the form, and refreshes records. Cancellation retains notes. |
| Documents (33 assertions across both roles) | Missing files, missing required expiry, past expiry, unsupported files, and 10 MiB + 1 byte files prevent transport. Rejection retains file/expiry; pending uploads block repeats. Success performs intent POST and storage PUT, clears file/expiry, refreshes records and client compliance, and retains category selection. Exactly 10 MiB succeeds; optional empty expiry is omitted. Refresh rejection preserves upload success with the separate refresh error. The client missing-document action selects its category and focuses the file input. |

## Appearance and accessibility

Desktop (1440px) and narrow (390px) screenshots were inspected. All extracted
forms retain their labels, required controls, messages, signature interaction,
and dialog behavior. No page-level horizontal overflow was observed; wide
record tables retain their existing internal horizontal scrolling. The saved
intake status, authorization summary, and both document desktop screenshots are
byte-identical to their pre-extraction counterparts. Referral screenshots were
also visually checked against their saved baseline.

| Surface | Desktop | Narrow |
| --- | --- | --- |
| Referrals | [Roster](005-frontend-workflow-separation/after-referral-table-desktop.png) | [Roster](005-frontend-workflow-separation/after-referral-table-mobile.png) |
| Intake | [Profile/status](005-frontend-workflow-separation/after-intake-status-desktop.png) | [Form and retained signature](005-frontend-workflow-separation/after-intake-form-mobile.png) |
| Authorization | [Summary/records](005-frontend-workflow-separation/after-authorization-desktop.png) | [Upload/records](005-frontend-workflow-separation/after-authorization-upload-mobile.png) |
| Client documents | [Upload/status](005-frontend-workflow-separation/after-client-documents-desktop.png) | [Upload/records](005-frontend-workflow-separation/after-client-documents-mobile.png) |
| Caregiver documents | [Upload/records](005-frontend-workflow-separation/after-caregiver-documents-desktop.png) | [Upload/records](005-frontend-workflow-separation/after-caregiver-documents-mobile.png) |

The browser checks establish frontend behavior with controlled responses. They
do not verify production storage, backend limit enforcement, or referral-to-client
provisioning. Backend conversion remains the limitation already recorded in
spec 002. Existing unrelated worktree changes were preserved.
