# 004: Centralize compliance calculations with explicit policy

Status: Complete; compatibility policy approved. Priority: P1. Audit finding: F4.

## Problem and outcome

The caregiver credential endpoint, client document-status endpoint, and admin
caregiver compliance endpoint implement separate expiry calculations:

- `backend/apps/caregivers/views.py:123` accepts approved expiring-soon documents
  as satisfying requirements.
- `backend/apps/documents/views.py:124` counts those documents as missing.
- `backend/apps/admin_portal/views.py:249` checks approved status without expiry.

One domain calculation must supply these endpoints with explicit role policy
and role-specific representations. The audit establishes divergence, not which
policy is correct.

## Required policy record before behavior changes

Record the decision, rationale, affected roles, and expected results here before
implementing changed compliance outcomes. The original open questions were:

| Decision | Current state | Required resolution |
|---|---|---|
| Approved document expiring within 30 days | Endpoint results differ | Does it satisfy a requirement, and for which roles? |
| Expiration today | Current comparisons treat today as expiring soon | Is validity inclusive through the expiration date? |
| Multiple documents of one type | Older expired records can affect overall compliance | Does a current approved replacement supersede older expired records? |
| Role differences | Caregiver/client logic differs | Which differences are intentional? |
| Evaluation date | Existing code uses date.today() | What business timezone/date convention governs daily boundaries? |

This record is the only policy dependency. Characterization and structural
consolidation that preserve each endpoint's existing results can proceed first.
Do not silently normalize the endpoints based on an assumed policy.

### Policy decision recorded 2026-11-09

The user selected **Preserve current endpoint results** before implementation.
The rationale is to centralize the calculation without making an unapproved
change to compliance outcomes. All three endpoint audiences are affected, with
the following explicit compatibility policies:

| Decision | Caregiver credentials | Client document status | Admin caregiver compliance |
| --- | --- | --- | --- |
| Approved and expiring within 30 days | Satisfies requirement; reported as expiring soon | Does not satisfy requirement; reported as missing and expiring soon | Satisfies requirement; listed as approved because expiry is ignored |
| Expiration today | Still expiring soon and satisfies requirement | Still expiring soon but does not satisfy requirement | Expiry ignored |
| Approved replacement for older expired upload | Older expiry still blocks overall compliance | Older expiry still blocks overall compliance | Approved uploads satisfy requirements; expired-status uploads are ignored, and approved uploads with past expiry remain approved |
| Role differences | Preserve this endpoint's existing rules | Preserve this endpoint's existing rules | Preserve this endpoint's existing rules |
| Evaluation date | View supplies existing process-local `date.today()` | View supplies existing process-local `date.today()` | Explicit date is supplied, but expiry does not affect this policy |

The 30-day window is inclusive at both today and day 30; day 31 is approved.
No new business timezone is selected. Consistent policy across roles, replacement
supersession, and a future business timezone remain separate product decisions.
These differences are retained for compatibility, not asserted to be intentional
long-term business rules.

Requirements remain scoped to profile state, required=True, and the requested
role or both. Documents remain scoped to owner and non-deleted records, without
an additional document-state filter. Optional uploaded documents still contribute
to expiry summaries and can block caregiver/client compliance. Duplicate names
from multiple uploads or overlapping role/both requirements remain preserved.

## Requirements

- Add a shared calculation in `backend/apps/documents/services.py` using owner,
  state, role, explicit evaluation date, and resolved policy inputs.
- Centralize document classification and required-type matching. Share loading
  where useful; avoid querying once per requirement or introducing a general
  configurable rules engine.
- Keep request authorization in views and preserve current owner/state scoping,
  soft-delete filtering, and required document-role selection.
- Preserve endpoint response keys and structures, including names versus type
  objects and the client summary. Representation adapters may remain distinct.
- Policy differences must be named and covered by cases; duplicate algorithms
  with hidden differences do not satisfy this spec.
- The evaluator must have no write side effects and must not use a hidden clock
  when tests supply an evaluation date.

## Acceptance criteria

- [x] Existing endpoint behavior is characterized before policy changes.
- [x] Open decisions have recorded outcomes before changed results ship.
- [x] Missing, pending, approved without expiration, expired, expiration today,
  within 30 days, exactly 30 days, and 31 days have explicit expected results.
- [x] Multiple same-type documents, optional requirements, soft deletion, and
  differing state/role requirements have expected results.
- [x] The three endpoints use the shared calculation and retain their response
  structures and authorization boundaries.
- [x] The same inputs/date/policy produce the same result without database writes.

## Focused validation

Extend relevant caregiver, document, and admin endpoint tests. Run
`python -m pytest apps/caregivers/tests.py apps/documents/tests.py apps/admin_portal/tests.py`.
Use fixed dates and synthetic records. Separate characterization assertions from
intentional policy changes in the review notes. No schema change is anticipated.

## Completion and review notes

Completed 2026-11-09. The shared, read-only calculation is
`calculate_document_compliance` in `backend/apps/documents/services.py`. Callers
supply owner, requirement state/role, evaluation date, and one of the named
`CAREGIVER_CREDENTIAL_POLICY`, `CLIENT_DOCUMENT_POLICY`, or
`ADMIN_CAREGIVER_POLICY` compatibility policies. Document classification and
required-type matching run once, loading requirements and owner uploads in two
queries with their document types. Immutable type/result snapshots support the
existing endpoint-specific representations.

Characterization was completed first: all 18 new endpoint characterization tests
passed against the original implementations before the calculations were moved.
These tests remain unchanged in expected outcomes after consolidation. There are
**no intentional compliance outcome changes**, following the user's preservation
decision above. Existing name lists, client type objects and summary, duplicate
entries, and admin `caregiver_id` formatting are retained.

Focused validation passed: **58 tests** using
`venv/Scripts/python.exe -m pytest apps/caregivers/tests.py apps/documents/tests.py apps/admin_portal/tests.py`
from `backend/`. Fixed-date synthetic cases cover missing/pending/rejected uploads,
approval without expiry, expired status and past dates, today/day 15/day 30/day 31,
replacements, optional requirements/uploads, soft deletion, owner and document
state scoping, requirement state/role selection, overlapping role/both
requirements, state-admin denial, and endpoint response structures.

Direct evaluator tests confirm that an explicit date controls the result without
calling an internal clock, repeated inputs/date/policy produce equal results,
model/audit data remain unchanged, and seven requirements/uploads still use only
two queries. No schema changes were introduced.
