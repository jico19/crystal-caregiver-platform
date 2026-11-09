# Plan 005: Explain the handwritten backend's purpose and non-obvious behavior

## Implementation record ? completed 2026-11-09

Comments were added after the serializer-folder follow-up. The documentation base
is commit 6db70ab, not the earlier planning commit. The owner's focused-verification
instruction supersedes the repeated full-suite gates below.

- Purpose explanations were added in 60 handwritten modules; all 84 handwritten
  modules were inventoried, including already explained configuration/schema files
  and empty package initializers. Coverage is recorded at the end of this file.
- All 84 executable ASTs are identical to the documentation base. Explanations
  are plain comments where docstrings could affect API schema descriptions.
- Added inline explanations distinguish newest submission from effective approval,
  required-only readiness counts, expiry versus historical completion, and
  filesystem cleanup after a failed upload transaction.
- Validated OpenAPI is unchanged. No behavior tests were rerun for comments;
  no migrations, generated files, fixtures, configuration values or test assertions
  were edited as part of documentation.

> Executor: complete the documentation-only steps and verification gates, then
> update plan 005 in plans/README.md. From root run:
> `git diff --stat c918fd4..HEAD -- backend/apps backend/config backend/manage.py`
> Compare with the expected results of plans 001–004. Record your own starting
> commit before editing; the executable-code comparison must use that fresh base,
> not c918fd4, because preceding plans intentionally moved executable code.

## Status

- Priority: P3
- Effort: M
- Risk: LOW — comments/docstrings only; schema-facing docstrings need restraint.
- Depends on: plans 001, 002, 003, 004
- Category: docs
- Planned at: commit `c918fd4`, 2026-11-09

## Why this matters

AGENTS.md now requires comments or docstrings explaining what new or changed
snippets do and what they are for. Existing handwritten backend modules have
sparse explanations, including subtle retry and onboarding rules. Establish a
consistent baseline without changing behavior or adding comments that merely
repeat each line. This addresses an older documentation gap, not a claim of
post-rule noncompliance.

## Current state

Examples confirmed during the audit:

```python
# backend/apps/operations/services/common.py:17
def retry_locked(function):
    @wraps(function)
    def run(*args, **kwargs):
        for attempt in range(8):
            try:
                return function(*args, **kwargs)
            except OperationalError as exc:
                if "locked" not in str(exc).lower():
                    raise
                if attempt == 7:
                    raise Conflict() from None
                time.sleep(0.025 * (attempt + 1))
    return run
```

This has no explanation of the bounded lock-contention retry or why exhaustion
is represented as a conflict. Do not describe it as retrying every database error
or guaranteeing serialized writes on every database.

```python
# backend/apps/operations/services/checklist.py:21
approved = [v for v in versions if v.review_status == "approved"]
effective = approved[-1] if approved else None
state = latest.review_status if latest else "missing"
```

onboarding_snapshot has no explanation of latest submission versus newest
approved effective version, or how expiry changes checklist readiness while
preserving completion history. Read the complete function and its tests before
writing that explanation. Do not invent an agency-approved requirement.

Other audited examples: operations/services/documents.py upload_document and
review_document have no local explanations; accounts/services.py has a module
docstring but no workflow function docstrings. Many view, serializer, test, and
model definitions likewise lack purpose explanations.

Existing exemplars:

- core/views.py health has the docstring
  `Public liveness check, without database or environment details.`
- onboarding_api.py upload handler comments that scope checks precede byte parsing
  and service authorization happens again under lock.
- operations/private_files.py attachment comments that callers must authorize
  the owning application/document first.

Match that concrete style. docs/architecture.md defines the current demo's
ownership and authorization policy. docs/api-conventions.md explains version-bound
answers, stale transition checks, private download behavior, and upload rejection
statuses. State-specific rules remain configurable and illustrative.

## Commands you will need

PowerShell commands from backend/ unless otherwise noted:

| Purpose | Command | Expected result |
| --- | --- | --- |
| Full backend gate | `./venv/Scripts/python.exe -m pytest` | All pass |
| Django check | `./venv/Scripts/python.exe manage.py check` | Exit 0, no errors |
| Before schema | `./venv/Scripts/python.exe manage.py spectacular --file .local/cleanup-005-before.yaml --validate --fail-on-warn` | Exit 0 |
| After schema | `./venv/Scripts/python.exe manage.py spectacular --file .local/cleanup-005-after.yaml --validate --fail-on-warn` | Exit 0 |
| Compare schema | `git diff --no-index -- .local/cleanup-005-before.yaml .local/cleanup-005-after.yaml` | Exit 0 |
| Frontend gates, from frontend/ | `npm.cmd run format:check`, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test` | Each exits 0 |
| Whitespace, from root | `git diff --check` | Exit 0 |

Availability was checked during planning; passing results were not established.
Backend formatter/lint are intentionally not configured. Do not install tools,
change configuration, migrate, or seed for documentation changes.

## Scope

Only comments and actual module/class/function docstrings in tracked handwritten
Python under backend/apps/, backend/config/, and backend/manage.py may change.
This includes the final test folders and dedicated serializer/permission modules
created by plans 001–004. No new source files, moves, renames, imports, values,
type annotations, decorators, SQL, control flow, or test assertions.

Additional allowed files: this plan may gain a concrete explanation inventory
under its Documentation record section; plans/README.md may receive plan 005's
status and verification results. These are documentation only.

Out of scope: every migrations/ file (especially applied migrations), generated
files, empty __init__.py files, caches, fixtures/documents, private .local content,
requirements/configuration data files, frontend, phase progression, policy changes,
and lint/formatter setup. Never backfill comments in migrations to satisfy this plan.

## Git workflow

Use a feature branch such as feat/backend-cleanup-comments after plans 001–004.
Before editing, record `git rev-parse HEAD` and initial git status. Use that SHA
as DOCUMENTATION_BASE below. Work in small documentation-only commits, for example
`Explain onboarding readiness and document lifecycle services`. Do not mix in
opportunistic refactors. Preserve unrelated dirty files; no push/PR is included.

## Steps

### Step 1: Inventory the final handwritten backend and capture the base

Read AGENTS.md, README.md, docs/phases.md, docs/architecture.md and
docs/api-conventions.md. From root enumerate files with `git ls-files backend`
and filter to .py in scope. Read each file before documenting it. Add a compact
coverage inventory to Documentation record below: module, symbols/blocks explained,
or reason no change is needed (empty initializer, already adequately explained,
or applied migration excluded). Record symbols, not source payloads or secrets.

For each handwritten module assess its purpose, top-level functions/classes,
methods, and coherent non-obvious blocks. Prefer one useful explanation of a
coherent snippet over comments on individual obvious assignments. A module
docstring alone is not enough for unrelated workflow functions in that module.
Add no policy claim not supported by the code and existing docs.

**Verify:** `git ls-files backend` accounts for every tracked .py path in the
inventory or exclusions. Record the clean starting SHA. Generate before-schema
with a fresh ignored evidence filename; it validates with no warnings/errors.

### Step 2: Explain services and the private-file boundary first

Read and document all final account and operations service modules and
operations/private_files.py. In particular explain:

- retry_locked's bounded retry of errors containing locked, final conflict,
  propagation of other errors, and its place around workflow transactions.
- subject's scoped caregiver lookup, ownership versus management checks, and lock.
- onboarding_snapshot's latest/effective distinction, required-only counts,
  expiry handling, application approval, allowed actions and completion history.
- complete_onboarding's readiness check and recorded evidence; this is a demo
  milestone and does not establish work authorization.
- application transitions' scoped lookup, lock order, expected-status comparison,
  terminal decisions, rejection reason, and audit/history writes.
- document fixture size/type/signature/digest checks, version creation, upload
  cleanup, review decision checks and audit behavior.
- account invitation/reset/create-user workflows, generic errors and configured
  local transport. Do not put example passwords or reset tokens in explanations.
- private writes and cleanup, immutable stored bytes, random keys, and the caller's
  authorization responsibility for downloads.

Write service docstrings explaining what a function does and why callers use it;
use inline comments at non-obvious branches. Describe existing behavior precisely,
including limitations. No new guarantees, exception handling, transactions, or checks.

**Verify:** run the executable AST comparison below against DOCUMENTATION_BASE.
It must print PASS after this batch. Read each explanation next to its cited
code/tests; do not treat AST parity as proof the prose is correct.

### Step 3: Explain the remaining layers and test intent

Complete the inventory for final views, serializers, permissions, models,
form/default helpers, management commands, settings/entrypoints and test modules.
Document each class/function or coherent snippet's purpose unless an existing
explanation already covers it. Explain serializer overrides and test fixtures
where behavior is subtle; describe security tests by the access boundary they
protect. Use comments for conventional Django field/Meta groups rather than
annotating every field assignment.

Use plain comments rather than new docstrings on DRF views/serializers when
docstrings would change generated API descriptions. Likewise avoid changing
management command help strings or any runtime-visible string. Do not expand
this into rewriting APIs, adding tests for prose, or changing owner policies.

**Verify:** rerun the AST comparison; every tracked .py path is accounted for in
the inventory. Generate after-schema and compare it to the baseline; exit 0.
If prose changes schema, switch to comments at that site rather than accepting
a schema change. Review the final coverage inventory for the two named original
gaps (retry_locked and onboarding_snapshot) and all edited snippets.

### Step 4: Complete repository verification and record evidence

Run full backend/frontend gates, manage.py check, and git diff --check. Review
the diff against the recorded documentation base, including any commits made in
this plan, to ensure only comments/docstrings and permitted planning prose changed.

**Verify:** all gates pass; AST parity and schema parity hold; every in-scope
module is covered in the inventory. Update the index with actual outcomes.

## Executable AST comparison

Run this from root. Set the PowerShell variable to the full SHA recorded at the
start of this plan (not the original planning SHA). This is a read-only command,
not a proposed new production helper or dependency. It prints paths only on failure.

```powershell
$documentationBase = 'DOCUMENTATION_BASE'
@'
import ast
from pathlib import Path
import subprocess
import sys

base = sys.argv[1]

class RemoveDocstrings(ast.NodeTransformer):
    def visit_Module(self, node):
        return self.clean(node)
    def visit_ClassDef(self, node):
        return self.clean(node)
    def visit_FunctionDef(self, node):
        return self.clean(node)
    def visit_AsyncFunctionDef(self, node):
        return self.clean(node)
    def clean(self, node):
        self.generic_visit(node)
        if (node.body and isinstance(node.body[0], ast.Expr)
                and isinstance(node.body[0].value, ast.Constant)
                and isinstance(node.body[0].value.value, str)):
            node.body = node.body[1:]
        return node

paths = subprocess.check_output(
    ['git', 'ls-tree', '-r', '--name-only', base, '--', 'backend'], text=True
).splitlines()
bad = []
for name in paths:
    path = Path(name)
    if path.suffix != '.py' or 'migrations' in path.parts:
        continue
    if not (name.startswith('backend/apps/') or name.startswith('backend/config/')
            or name == 'backend/manage.py'):
        continue
    before = subprocess.check_output(['git', 'show', f'{base}:{name}'])
    try:
        old = ast.dump(RemoveDocstrings().visit(ast.parse(before)))
        new = ast.dump(RemoveDocstrings().visit(ast.parse(path.read_bytes())))
    except (OSError, SyntaxError):
        bad.append(name)
        continue
    if old != new:
        bad.append(name)
assert not bad, bad
changed = subprocess.check_output(
    ['git', 'diff', '--name-status', base, '--', 'backend'], text=True
).splitlines()
assert all(line.startswith('M\t') and line.endswith('.py')
           and '/migrations/' not in line for line in changed), changed
print('PASS: executable ASTs unchanged; tracked backend changes are documentation candidates')
'@ | backend/venv/Scripts/python.exe -B - $documentationBase
```

This does not replace prose review. It intentionally ignores true docstrings,
not arbitrary string expressions; unchanged AST does not prove comments are
accurate. Also compare git status to the starting status to detect new untracked
files, which are not permitted by this plan.

## Test plan and done criteria

No new tests: explanations should not require behavioral changes or tests of
comments. Existing suites and schema parity are the regression checks.

- [ ] Documentation inventory covers every tracked handwritten backend Python file.
- [ ] Named retry, onboarding and workflow gaps have accurate purpose explanations.
- [ ] Every snippet changed by this plan has an appropriate comment/docstring.
- [ ] AST comparison passes against this plan's actual starting commit.
- [ ] No applied migration or runtime/schema behavior changed.
- [ ] Full backend/frontend, schema, Django and whitespace checks pass.
- [ ] Only permitted files changed; plan index includes actual results.

## STOP conditions

Stop if code intent cannot be established from source/tests/docs (record the
uncertainty rather than inventing policy), the base has uncommitted backend edits,
the AST changes, a schema difference cannot be avoided with comments, a formatter
or linter fails, or any verification gate still fails after two scoped attempts.
Do not add a dependency or change tooling to make documentation checks pass.

## Maintenance notes

Keep explanations beside the behavior they describe and update them when behavior
changes. Comments must not claim HIPAA compliance, legal validity, production
readiness, or an approved agency workflow. Prefer short descriptions of intent,
boundary and purpose over duplicated implementation narration.

## Documentation record

Documentation base: `6db70ab`. Every executable AST matches that base after
annotation. The table records symbols covered by new or existing explanations;
conventional Django Meta field/constraint groups are covered by their owning class.

| Module | Explanation coverage / exclusion |
| --- | --- |
| `backend/apps/__init__.py` | Empty package initializer; excluded |
| `backend/apps/accounts/__init__.py` | Empty package initializer; excluded |
| `backend/apps/accounts/access.py` | admin_branches; scope_people |
| `backend/apps/accounts/admin.py` | module purpose |
| `backend/apps/accounts/apps.py` | AccountsConfig |
| `backend/apps/accounts/backends.py` | EmailBackend; EmailBackend.authenticate |
| `backend/apps/accounts/management/__init__.py` | Empty package initializer; excluded |
| `backend/apps/accounts/management/commands/__init__.py` | Empty package initializer; excluded |
| `backend/apps/accounts/management/commands/audit_private_files.py` | Command; Command.handle |
| `backend/apps/accounts/management/commands/check_login_emails.py` | Command; Command.handle |
| `backend/apps/accounts/management/commands/seed_demo.py` | Command; Command.handle; Command.account |
| `backend/apps/accounts/models.py` | User (existing docstring); Invitation |
| `backend/apps/accounts/permissions.py` | IsBusinessAdmin (existing purpose comment); IsBusinessAdmin.has_permission; IsBusinessAdmin.has_object_permission |
| `backend/apps/accounts/serializers/__init__.py` | Existing module docstring describes configuration or schema purpose |
| `backend/apps/accounts/serializers/branches.py` | BranchSerializer (existing purpose comment) |
| `backend/apps/accounts/serializers/inputs.py` | StrictSerializer; StrictSerializer.to_internal_value; LoginInput; PasswordInput; PasswordInput.validate_password; InvitationInput; AcceptInput; ResetRequestInput; ResetConfirmInput |
| `backend/apps/accounts/serializers/outputs.py` | BranchOutput; SessionOutput; CSRFOutput; AuthOutput; DetailOutput; InvitationOutput; ApplicationOutput |
| `backend/apps/accounts/services.py` | audit; create_user; email_link; invite; accept_invitation; request_reset; confirm_reset (existing docstring) |
| `backend/apps/accounts/tests/__init__.py` | Existing module docstring describes configuration or schema purpose |
| `backend/apps/accounts/tests/test_foundation.py` | UserFactory; config; graph; browser; csrf; application_data; test_anonymous_csrf_and_private_denial; test_ownership_and_branch_boundaries; test_admin_does_not_cross_agencies; test_inactive_assignments_and_django_flags_do_not_grant_access; test_application_creates_account_profile_status_and_audit; test_application_rejects_forged_fields; test_existing_email_is_not_claimed_and_failed_application_rolls_back; test_invitations_scope_expiry_reuse_and_existing_user; test_reset_is_generic_and_token_is_single_use; test_seeds_are_repeatable_and_preserve_passwords; test_case_insensitive_email_constraint |
| `backend/apps/accounts/views.py` | identity; BranchList; PublicAuthView; PublicAuthView.input; CSRFView; CSRFView.get; LoginView; LoginView.post; LogoutView; LogoutView.post; MeView; MeView.get; InvitationView; InvitationView.post; AcceptView; AcceptView.post; ResetRequestView; ResetRequestView.post; ResetConfirmView; ResetConfirmView.post |
| `backend/apps/core/__init__.py` | Empty package initializer; excluded |
| `backend/apps/core/api.py` | api_exception_handler; csrf_failure |
| `backend/apps/core/apps.py` | CoreConfig |
| `backend/apps/core/serializers/__init__.py` | Existing module docstring describes configuration or schema purpose |
| `backend/apps/core/serializers/health.py` | Existing module docstring describes configuration or schema purpose |
| `backend/apps/core/tests/__init__.py` | Existing module docstring describes configuration or schema purpose |
| `backend/apps/core/tests/test_core.py` | test_public_health_response; test_health_rejects_writes; test_default_api_denies_anonymous_requests; test_default_api_denies_anonymous_requests.PrivateView; test_default_api_denies_anonymous_requests.PrivateView.get; test_custom_user_persists_with_hashed_password |
| `backend/apps/core/urls.py` | module purpose |
| `backend/apps/core/views.py` | health (existing docstring) |
| `backend/apps/operations/__init__.py` | Empty package initializer; excluded |
| `backend/apps/operations/api.py` | published_jobs; JobViewSet; JobViewSet.get_serializer_class; ApplyView; ApplyView.post; CaregiverViewSet; CaregiverViewSet.get_queryset; ClientViewSet; ClientViewSet.get_queryset; ApplicationViewSet; ApplicationViewSet.transitions; ApplicationViewSet.packet; ApplicationViewSet.get_serializer_class; ApplicationViewSet.get_queryset |
| `backend/apps/operations/application_forms.py` | application_answers |
| `backend/apps/operations/demo_content.py` | seed_branch_content |
| `backend/apps/operations/demo_onboarding.py` | seed_application_version; seed_requirements |
| `backend/apps/operations/filters.py` | OnboardingFilter |
| `backend/apps/operations/models/__init__.py` | module purpose |
| `backend/apps/operations/models/base.py` | relation; actor; unique; date_range; one_subject; Record; ScopedRecord |
| `backend/apps/operations/models/care.py` | ClientAuthorization; AuthorizationDocument; AuthorizationEvent; CarePlan; ServiceScheduleEntry |
| `backend/apps/operations/models/documents.py` | StoredFile; DocumentType; BranchDocumentRequirement; Document; DocumentVersion; DocumentReview |
| `backend/apps/operations/models/forms.py` | FormTemplate; FormVersion; SignatureRequest; SignatureEvent |
| `backend/apps/operations/models/identity.py` | Agency; StateBranch; AgencyAdmin; BranchStaff; PersonRecord; Caregiver; Client |
| `backend/apps/operations/models/intake.py` | CaregiverApplication; ClientIntake; Review; ApplicationReview; IntakeReview |
| `backend/apps/operations/models/jobs.py` | JobPosting; JobSubmission |
| `backend/apps/operations/models/notifications.py` | Announcement; ReminderRule; Notification; NotificationDelivery; DeliveryAttempt; AuditEvent |
| `backend/apps/operations/models/onboarding.py` | BranchOnboardingPolicy; CaregiverOnboardingEvent |
| `backend/apps/operations/models/training.py` | TrainingCourse; TrainingCourseVersion; TrainingAssignment; TrainingCertificate |
| `backend/apps/operations/models/website.py` | BranchContent; WebsiteInquiry; ReferralSource; ClientReferral |
| `backend/apps/operations/onboarding_api.py` | scoped_caregivers; scoped_documents; OnboardingView; OnboardingView.get; CaregiverDocuments; CaregiverDocuments.get; CaregiverDocuments.post; DocumentDetail; DocumentDetail.get_queryset; VersionDownload; VersionDownload.get; VersionReview; VersionReview.post; CompleteOnboarding; CompleteOnboarding.post; OnboardingQueue; OnboardingQueue.get_queryset; OnboardingQueue.get |
| `backend/apps/operations/private_files.py` | cleanup_private_writes; cleanup_private_writes.wrapped; private_root; write_private; attachment |
| `backend/apps/operations/public_content.py` | BranchContentList; BranchContentList.get_queryset |
| `backend/apps/operations/serializers/__init__.py` | Existing module docstring describes configuration or schema purpose |
| `backend/apps/operations/serializers/applications.py` | ApplicationInput (existing purpose comment); ApplicationInput.validate_demo_acknowledged; ApplicationInput.validate; ApplicationSerializer (existing purpose comment); FormVersionSerializer; ApplicationReviewSerializer; ApplicationDetailSerializer; ApplicationDetailSerializer.get_packet_available |
| `backend/apps/operations/serializers/content.py` | BranchContentSerializer (existing purpose comment) |
| `backend/apps/operations/serializers/documents.py` | UploadInput; DocumentReviewSerializer; DocumentVersionSerializer; DocumentSerializer; DocumentSerializer.get_versions; DocumentSerializer.get_effective_version |
| `backend/apps/operations/serializers/jobs.py` | JobSerializer (existing purpose comment); JobDetailSerializer (existing purpose comment) |
| `backend/apps/operations/serializers/onboarding.py` | OnboardingOutput (existing purpose comment) |
| `backend/apps/operations/serializers/people.py` | PersonSerializer (existing purpose comment); ClientSerializer (existing purpose comment) |
| `backend/apps/operations/serializers/reviews.py` | TransitionInput; ReviewInput; CompletionInput |
| `backend/apps/operations/services/__init__.py` | module purpose |
| `backend/apps/operations/services/applications.py` | apply_to_job |
| `backend/apps/operations/services/checklist.py` | onboarding_snapshot; complete_onboarding |
| `backend/apps/operations/services/common.py` | Conflict; retry_locked; retry_locked.run; subject; audit |
| `backend/apps/operations/services/documents.py` | TooLarge; UnsupportedMedia; fixture_bytes; upload_document; review_document |
| `backend/apps/operations/services/transitions.py` | transition_application |
| `backend/apps/operations/tests/__init__.py` | Empty package initializer; excluded |
| `backend/apps/operations/tests/concurrency_probe.py` | race; race.worker |
| `backend/apps/operations/tests/conftest.py` | onboarding |
| `backend/apps/operations/tests/test_applications.py` | extended; answers; test_extended_answers_and_original_schema_detail; test_invalid_answers_are_atomic; test_legacy_and_permissions; test_stale_job_and_submission_audit_failure_are_atomic |
| `backend/apps/operations/tests/test_concurrency.py` | test_real_sqlite_concurrent_versions_reviews_transitions_and_completion |
| `backend/apps/operations/tests/test_integrity.py` | branches; sample (existing docstring); copy_values; test_cross_state_insert_is_rejected; test_one_login_has_separate_state_records; test_state_admin_cannot_hold_two_active_states; test_evidence_is_append_only; test_submitted_answers_cannot_be_replaced; test_pending_replacement_preserves_approved_version; test_invalid_dates_and_progress_are_rejected; test_repeated_training_is_supported; test_delivery_deduplication_and_simulation; test_catalog_does_not_impose_requirements; test_document_requires_exactly_one_owner; test_draft_cannot_move_state; test_certificate_requires_completed_training; test_signature_rejects_unrequested_signer; test_authorization_cannot_use_another_clients_document |
| `backend/apps/operations/tests/test_onboarding.py` | fixture; approve_application; test_review_transitions_staleness_and_atomic_rollback; test_full_lifecycle_completion_and_historical_evidence; test_expiry_boundaries_and_replacement_effective_version; test_file_rollback_and_decision_rollback; test_empty_requirements_and_config_edits; test_newest_approval_expiry_does_not_fall_back_and_review_is_terminal; test_completion_audit_failure_rolls_back_milestone; test_seed_preserves_packet_published_schema_and_policy_edits; test_seed_failure_removes_new_packet_bytes; test_seed_failure_removes_new_packet_bytes.fail_after_packet; test_each_category_and_format_and_exact_download |
| `backend/apps/operations/tests/test_onboarding_permissions.py` | matrix; test_every_private_read_and_guessed_uuid_is_scoped; test_management_permissions_csrf_and_forged_fields; test_rejects_arbitrary_and_malformed_uploads_without_writes; test_inactive_branch_and_assignment_hide_data |
| `backend/apps/operations/tests/test_public_content.py` | test_only_published_active_state_content_is_public; test_seed_preserves_content_edits_and_publication |
| `backend/config/__init__.py` | Empty package initializer; excluded |
| `backend/config/asgi.py` | module purpose |
| `backend/config/settings/__init__.py` | Empty package initializer; excluded |
| `backend/config/settings/base.py` | required_env |
| `backend/config/settings/browser_tests.py` | Existing module docstring describes configuration or schema purpose |
| `backend/config/settings/development.py` | Existing module docstring describes configuration or schema purpose |
| `backend/config/settings/production.py` | Existing module docstring describes configuration or schema purpose |
| `backend/config/urls.py` | module purpose |
| `backend/config/wsgi.py` | module purpose |
| `backend/manage.py` | main |

All applied migration modules were excluded and remain unchanged. Generated
caches, fixture bytes and ignored local data were excluded. New verification
helpers and captured schemas remain ignored under backend/.local/.
