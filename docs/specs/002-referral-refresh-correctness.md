# 002: Report successful referral updates correctly

Status: Complete. Priority: P1. Audit finding: F2. Depends on: none.

## Problem and outcome

`frontend/src/features/admin/pages/ReferralsPage.jsx:121` destructures `reload`
from `useFetch`, but `frontend/src/shared/hooks/useFetch.js` returns `refetch`.
After a successful status or notes write, `reloadAll` calls an undefined
analytics refresh function and the mutation catch handler displays failure.
Successful writes must remain successful and trigger the intended refreshes.

## Scope and requirements

- Correct the analytics refresh binding in ReferralsPage to use the existing
  `refetch` contract. Keep the paginated table's existing reload mechanism.
- After a successful status change or notes save, refresh the referral list and
  analytics for the current filters. Preserve current confirmation and message
  behavior, apart from eliminating the false mutation error.
- A failed mutation must display the actual failure without reporting success.
- Do not introduce a shared-hook alias, alter endpoint contracts, restructure the
  page, change query caching policy, or implement referral-to-client conversion.
- A separate refresh/network failure must not be described as a failed write if
  the write already succeeded; retain existing query error reporting where used.

## Acceptance criteria

- [x] Analytics refresh uses a callable returned by useFetch; the page does not
  destructure its nonexistent reload property.
- [x] A successful status change sends one mutation, refreshes both queries, and
  displays no false update failure.
- [x] A successful notes save persists notes, closes the intended dialog, and
  refreshes the visible data without a false save failure.
- [x] A rejected mutation displays its failure and does not display success.
- [x] Existing filters, pagination, state permissions, and confirmation behavior
  remain unchanged.

## Focused validation

Run `npm run lint` and `npm run build` from `frontend/`. With synthetic referrals,
exercise status change, notes save, rejected mutation, and query refresh using a
local backend or controlled browser responses. Record whether data refreshes and
which message appears; lint/build alone do not establish these outcomes.

Check the conversion action only to verify refresh behavior when its write
succeeds. If the backend lacks conversion behavior, record that independently.
No new frontend test framework is required for this isolated fix.

## Completion record

Completed 2026-11-09. Analytics now binds `refetch` from `useFetch`; the table
keeps its existing `reload`. Both handlers refresh after leaving the mutation
error handler. Notes saves clear prior mutation messages before writing.

`npm run lint` and `npm run build` passed from `frontend/`. Lint reported four
existing warnings in `tabs.jsx`, `button.jsx`, `badge.jsx`, and `PublicLayout.jsx`;
none were in the changed page.

Browser validation used the local Vite application, 45 synthetic referrals,
synthetic administrator sessions, and controlled fetch responses. Requests,
persisted fixture data, dialogs, alerts, and rendered rows/analytics were checked.
Successful roster mutations retained Florida filtering, page 2, and page size 20.

| Scenario | Observed result |
| --- | --- |
| Status changed to contacted | One PATCH, then list and analytics GETs with `state_id=1`; list retained `page=2&page_size=20`. Row changed to In Evaluation; only `Referral marked as "In Evaluation".` appeared. |
| Notes saved | One PATCH and both refreshes; saved notes appeared in the row, the notes dialog closed, and only `Intake notes updated for Synthetic Lead 21.` appeared. |
| Notes rejected after an earlier success | One rejected PATCH, no refreshes, unchanged stored notes, dialog stayed open, and only `Synthetic notes permission denied.` appeared. |
| Status rejected | One rejected PATCH, no refreshes, unchanged status, and only `Synthetic status permission denied.` appeared. |
| Successful status or notes write followed by failed refreshes | One successful PATCH and both GETs, including the existing single query retry. The write stayed saved; its success message remained alongside the separate list query error `Synthetic referral refresh unavailable.`. No false write failure or unhandled rejection appeared. |
| Conversion status confirmed | No PATCH before confirmation; confirmation sent one PATCH and refreshed both queries, closed the dialog, and displayed `Referral marked as "Converted to Client".`. The row and analytics updated to one converted lead and a 4% conversion rate. |
| Florida state administrator | Only Florida appeared in the jurisdiction options. A pipeline status change sent one PATCH and refreshed both queries with `state_id=1`; the card moved into In Evaluation with the expected success message. |

Backend limitation, independently checked in `AdminReferralDetailView.patch` and
`ClientReferralSerializer`: conversion currently saves the referral status without
creating a client profile or returning `client_id`. That behavior remains outside
this fix. Controlled browser responses verify the frontend refresh and message
behavior, not backend conversion or backend filter enforcement.
