# Plan 001: Apply the repository rules incrementally

Status: PROPOSED. Written 2026-11-09 at commit `eb50f19`.
Category: security, correctness, architecture, maintainability.
Effort: several focused changes; do not implement this as one large refactor.

## Context and boundaries

This is a Django/DRF backend in backend/apps and a React 19/Vite/Tailwind v4
frontend. The product combines FL, IN, and GA public sites and separate caregiver,
client, and administrator workflows. Preserve state-scoped authorization,
signatures, document expiry behavior, existing routes, and response shapes unless
a batch explicitly fixes a validated behavior defect.

Before each batch, run `git diff --stat eb50f19..HEAD -- backend/apps frontend/src`
and inspect local changes with `git status --short`. Compare the excerpts below
to live files. Adapt line numbers only when the relevant behavior is unchanged;
if ownership or policy changed, reassess that batch before editing. Preserve the
user's existing AGENTS.md changes. Create focused commits with descriptive
imperative subjects; do not push or publish without a request.

New Python follows four spaces, snake_case, and PEP 8. New JS/JSX follows two
spaces and surrounding quote/semicolon conventions. Use both
`tailwind-design-system` and `design-taste-frontend` for any UI component changes,
and applicable React guidance. Reuse the clinical portal design: existing shared
primitives, clear page headers, tables, explicit loading/error states, and existing
emerald brand. Avoid an unsolicited visual redesign.

## Commands and current baseline

| Purpose | Working directory | Command | Expected result |
|---|---|---|---|
| Frontend lint | frontend | npm.cmd run lint | Exit 0; audit baseline has four warnings, no new warnings. |
| Frontend build after frontend source changes | frontend | npm.cmd run build | Exit 0; not run during audit. |
| Targeted Python tests | backend, configured venv | python -m pytest apps/<domain>/tests.py | All selected tests pass; not run during audit. |
| Scope check | repository root | git diff --stat | Only current batch files and intentional plan status updates. |

There is no frontend test script. Use focused browser flows after frontend
behavior changes with synthetic records. Record action, expected result, and
observed result; do not claim lint/build proves behavior. Do not run a full test
suite for documentation, style-only changes, or an isolated workflow change.

## Batch A: Protect existing identities during public applications

Priority P0; effort S-M; risk MED; independent of other batches.

In scope: backend/apps/caregivers/services.py, serializers.py, tests.py; adjust
views.py only if necessary for a stable DRF validation error response.
Out of scope: auth redesign, password reset flow, schema migrations, UI redesign.

Current state: ApplyPublicView uses AllowAny (views.py:17), its serializer calls
submit_caregiver_application (serializers.py:59), and the service does:

```python
user, created = User.objects.get_or_create(email=email, defaults={...})
if "password" in data and data["password"]:
    user.set_password(data["password"])
    user.role = role
    user.state = state
    user.status = "active"
    user.save()
```

1. Extend caregivers/tests.py using test_caregiver_apply_public_atomic as the
   structural example. Use synthetic accounts. Cover an existing caregiver and
   an existing administrator, case-normalized email, unchanged password hash,
   role, state, status, profile, and application count after rejected submission.
   Keep the fresh-email application happy path.
2. Make anonymous application creation reject an existing identity through an
   appropriate validation error without mutating it. Keep creation atomic and
   rely on existing email uniqueness for concurrent creation; do not implement
   a separate unprotected check-then-create path. Do not invent an account-linking
   or sign-in flow in this batch.
3. Verify from backend: `python -m pytest apps/caregivers/tests.py` -> all pass.
   Review the diff to confirm the existing-identity branch performs no writes.

Done: existing identities remain unchanged, no linked application/profile is
created on rejection, and the original new-user path passes. This is a behavior
fix, not merely a layer extraction.

## Batch B: Correct referrals refresh before refactoring

Priority P1; effort S; risk LOW; independent of A.

In scope: frontend/src/features/admin/pages/ReferralsPage.jsx only.
Current state at line 121:

```js
const { data: analyticsData, reload: reloadAnalytics } = useFetch(...);
```

useFetch.js returns `refetch: query.refetch`, without reload. The page calls
reloadAnalytics in reloadAll after successful status and note writes.

1. Alias the existing refetch property to reloadAnalytics. Do not change the
   shared hook's public interface or add a compatibility wrapper for one caller.
2. Run frontend lint and build -> both exit 0 with no additional lint warnings.
3. In a local synthetic referral flow, change status and save notes. Confirm each
   write refreshes table/analytics without displaying a false failure. Check the
   conversion action separately; if it fails because backend conversion is not
   implemented, record that independent issue rather than expanding this fix.

Done: no reload property is destructured from useFetch; successful writes no
longer fail because of an undefined refresh function. A mutation failure still
shows its actual error.

## Batch C: Separate admin action validation and orchestration

Priority P1; effort M per action; risk MED.

In scope: backend/apps/admin_portal/views.py, serializers.py, tests.py; create
backend/apps/clients/services.py and extend caregiver services for their respective
domain actions. Out of scope: all other admin resources and generic CRUD rewrites.

Current state: AdminClientAdmissionView.post at views.py:333 reads request.data,
assigns status/date/notes, saves, and writes audit history. Application review at
:197 has a similar orchestration flow with inline status validation.

1. Add focused tests for currently valid admission/review operations, cross-state
   denial, and audit fields using admin_portal/tests.py:22 as the test style.
   Verify with `python -m pytest apps/admin_portal/tests.py` -> pass.
2. Add dedicated action serializers for status choices, dates, and notes. Use
   Client.STATUS_CHOICES and the existing allowed review states. Add invalid
   status/date cases that expect DRF 400 responses. Preserve the current omitted
   admission-status default unless intentionally changing that contract.
3. Move state transitions and audit orchestration into domain services. Keep
   authentication/object permission checks in views, input validation in
   serializers, business rules in services, and representation in serializers.
   Make coupled mutation/audit writes atomic; avoid passing the whole request
   through all business logic merely for convenience. Adapt existing audit helper
   usage minimally rather than redesigning the audit framework.
4. Run `python -m pytest apps/admin_portal/tests.py apps/clients/tests.py
   apps/caregivers/tests.py` -> all affected tests pass. Review response/status
   differences explicitly; invalid inputs are the intended validation change.

Done: these two action views validate then delegate; no workflow fields are
assigned directly from request.data; invalid inputs do not create audit/mutation
side effects. Simple profile CRUD remains unchanged.

## Batch D: Resolve compliance policy before deduplicating it

Priority P1; effort M; risk HIGH until policy is explicit.

In scope: caregiver credential status, client document status, admin caregiver
compliance, their tests, and a new backend/apps/documents/services.py calculation.

Current state: caregivers/views.py:123 accepts expiring-soon approved documents
as satisfying requirements; documents/views.py:124 counts these as missing;
admin_portal/views.py:249 does not check expiration on approved documents.

1. Characterize each endpoint with missing, pending, approved, expired, expiring
   today, expiring within 30 days, multiple documents of one type, and differing
   roles/states. Run the corresponding focused tests -> characterization passes.
2. Document whether roles intentionally differ. If specifications do not settle
   this, obtain a policy decision before changing endpoint results. Agreement on
   shared implementation is not agreement on a single role policy.
3. Extract a calculation that accepts explicit role/state/date inputs and any
   justified policy difference. Retain role-specific output shapes. Add tests
   demonstrating the agreed boundaries and preservation of state permissions.
4. Run `python -m pytest apps/caregivers/tests.py apps/documents/tests.py
   apps/admin_portal/tests.py` -> pass with agreed expected results.

Done: one calculation with explicit policy; no three independently maintained
expiry algorithms. Any intentional behavior change is documented and tested.

## Batch E: Extract frontend workflows one feature at a time

Priority P2; effort M per feature; risk MED; referrals depends on B.

In scope: ReferralsPage, client IntakePage/AuthorizationsPage, client/caregiver
DocumentsPage, their feature components/hooks/services/schemas, and narrow shared
document upload code. Do not edit unrelated dashboards or replace state libraries.

Existing pattern: caregiver ApplicationPage.jsx:20 calls useCaregiverApplication;
that hook uses React Hook Form with the Zod schema in shared/utils/validation.js.
admin/services/clientDetailService.js demonstrates endpoint encapsulation.

1. Referrals: move filters/query parameters, mutations and refresh orchestration
   into useReferralsData; move endpoint operations into referralService. Extract
   toolbar, pipeline, table, and dialogs into feature components where useful.
   Keep state jurisdiction enforcement and pagination/search behavior unchanged.
2. Intake: move form defaults, signature/phone/date/insurance validation, and
   payload mapping from IntakePage.jsx:98-175 into useClientIntake, a Zod schema,
   and a feature service. Reuse current messages/null mapping initially.
3. Authorization upload: extract fields, validation, FormData creation, and
   mutation from AuthorizationsPage.jsx:54-142. Move unit/hour calculations into
   named pure helpers rather than burying them in markup.
4. Documents: extract the duplicated file/expiration validation and upload state
   into a narrow shared hook/schema. Reuse shared/utils/documentUtils.js:14's
   transport behavior through a shared service; keep role-specific queries,
   labels and layout in their features. Avoid a component with many role flags.
5. After EACH feature, run frontend lint/build -> pass. Exercise only that
   feature's valid submission, invalid submission, server error, cancellation,
   and successful refresh flows. For forms also check initial defaults, signature
   retention, date boundaries, and repeated submission prevention.

Done: page files compose components and call feature hooks; no direct API client
imports or payload/schema definitions remain in the targeted page files. Reusing
the API client inside services is expected. Local leaf-component presentation
state is acceptable; avoid merely moving an entire page into one enormous hook.

## Batch F: Extract remaining backend workflows separately

Priority P2; effort L across several changes; risk MED-HIGH.

In scope: backend/apps/clients/views.py, documents/views.py, their domain services,
validators and tests. Take intake, agreement signing, and storage as separate
changes; do not change database schema or public response contracts.

1. Characterize intake persistence and signature fields. Extract its orchestration
   into clients/services.py; retain serializer validation and IsClient checks.
2. Characterize agreement body, title, signed_at, canonical hash input, version
   increments, and deduplicated listing using clients/tests.py:117. Extract signing
   without altering signed content or recomputing historical hashes. Address any
   concurrency/version design change separately if schema work is required.
3. Characterize upload and unauthorized-upload behavior using documents/tests.py:39
   and :79. Keep parser/HTTP handling in the view, byte validation in validators,
   and storage/status/audit orchestration in document services.
4. Verify each change with `python -m pytest apps/clients/tests.py` or
   `python -m pytest apps/documents/tests.py` respectively -> all selected tests
   pass. Add fault-path tests where new transaction boundaries affect persistence.

Done: the selected views validate/authorize/delegate/respond; signed data, version
history, storage access, and response shapes remain stable.

## Batch G: Enforce style and consistency incrementally

Priority P3; effort S-M per change; risk LOW-MED.

1. Correct frontend/CONTEXT.md's obsolete backend map and the Pydantic references
   in shared/utils/validation.js. Verify paths/framework claims against actual
   files. Documentation-only changes require no tests.
2. Introduce a Python style check and committed configuration/dev dependency,
   such as pycodestyle with PEP 8 defaults. Establish a legacy baseline and clean
   touched workflow modules first. Once installed/configured, check changed
   Python files using `python -m pycodestyle <changed files>` -> no findings.
   Move late imports only after checking circular-import implications. Do not
   suppress a rule globally just to obtain a green result. Pure whitespace-only
   changes need style checking, not workflow tests.
3. With both required UI skills, consolidate semantic brand/surface/border/focus
   tokens in frontend/src/index.css and consume them in Button/Input variants.
   Remove ConfirmModal's duplicate primary styling and migrate the referrals
   search control to shared Input. Retain meaningful status palette differences.
4. Run frontend lint/build after UI source changes -> pass. Compare affected
   controls in normal, hover, focus, disabled, loading, and destructive states,
   at narrow and desktop widths. Inspect theme behavior only if the app exposes
   that theme. Preserve current portal appearance while centralizing styling.

Done: changed Python files pass the agreed checker; context matches Django; the
targeted controls consume one shared variant/token definition. Do not require
every legacy page to migrate before shipping a focused improvement.

## Stop and reassess conditions

- In-scope behavior has drifted from the cited excerpts or user changes overlap.
- A focused test/build fails because of an unrelated baseline issue: record it
  and isolate it rather than including a speculative broad fix.
- Compliance policy is unresolved, or signing changes would alter stored evidence.
- A supposedly mechanical extraction needs schema changes or a public API change.
- The public signup fix appears to require silently linking an existing account.

## Review and maintenance

For each batch, record changed behavior, relevant tests or browser checks, and
known limitations. Update its status in plans/README.md only after verification.
Future changes should extend existing domain services, feature hooks, validation
schemas and primitive variants instead of adding another parallel implementation.
The main review question is whether responsibilities became clearer without
introducing extra abstractions that have no useful behavior of their own.
