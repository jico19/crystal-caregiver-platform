# Plan 002: Separate serializer classes from backend view modules

## Implementation record ? completed 2026-11-09

The owner explicitly requested dedicated serializer folders during implementation.
This record supersedes the original standalone-module destinations and repeated
full-suite gates in the archived plan below.

| Original destination | Final destination under backend/apps/ |
| --- | --- |
| accounts/serializers.py BranchSerializer | accounts/serializers/branches.py |
| accounts/contracts.py | accounts/serializers/outputs.py |
| accounts/serializers.py account inputs | accounts/serializers/inputs.py |
| operations/job_serializers.py | operations/serializers/jobs.py |
| operations/person_serializers.py | operations/serializers/people.py |
| operations/application_serializers.py | operations/serializers/applications.py |
| operations/document_serializers.py | operations/serializers/documents.py |
| operations/onboarding_serializers.py | operations/serializers/onboarding.py |
| operations/content_serializers.py | operations/serializers/content.py |
| operations/review_inputs.py | operations/serializers/reviews.py |
| core/views.py inline health schema | core/serializers/health.py |

All 33 named serializer class bodies match their originals. The schema-only health
instance retains the same inline name and fields. Django imports and validated
OpenAPI parity pass. Views import dedicated serializers; serializers do not import
views. Commits: a147912 and 6db70ab. No new placement tests were added.

> Executor: follow the steps and run every verification gate. Update plan 002 in
> plans/README.md. From root run:
> `git diff --stat c918fd4..HEAD -- backend/apps/accounts backend/apps/operations`
> Inspect git status and uncommitted diffs too. Plan 001 test moves are expected;
> unexpected changes to the serializer/view excerpts below require reconciliation.

## Status

- Priority: P2
- Effort: S
- Risk: LOW — imports, inherited Meta definitions, and schema names need care.
- Depends on: plan 001 (test folder relocation)
- Category: tech-debt
- Planned at: commit `c918fd4`, 2026-11-09

## Why this matters

Eight serializer classes are mixed into four view modules despite the separation
rule. Moving them into dedicated serializer modules makes ownership explicit and
keeps future HTTP handlers from accumulating representation logic. This is a
behavior-preserving extraction, not an opportunity to redesign responses.

## Current state

| Current definition | Responsibility | Destination |
| --- | --- | --- |
| accounts/views.py:51 BranchSerializer | Public branch fields | accounts/serializers.py |
| operations/api.py:20 JobSerializer | Job list fields | operations/job_serializers.py (new) |
| operations/api.py:28 JobDetailSerializer | Job plus original form schema | operations/job_serializers.py (new) |
| operations/api.py:80 PersonSerializer | Caregiver directory fields | operations/person_serializers.py (new) |
| operations/api.py:88 ClientSerializer | Client directory model selection | operations/person_serializers.py (new) |
| operations/api.py:119 ApplicationSerializer | Application list fields | operations/application_serializers.py |
| operations/onboarding_api.py:24 OnboardingOutput | Checklist/queue output schema | operations/onboarding_serializers.py (new) |
| operations/public_content.py:8 BranchContentSerializer | Published branch content | operations/content_serializers.py (new) |

All paths above are under backend/apps/. Preserve these load-bearing excerpts:

```python
# operations/api.py:28
class JobDetailSerializer(JobSerializer):
    application_form = FormVersionSerializer(source="form_version")

    class Meta(JobSerializer.Meta):
        fields = JobSerializer.Meta.fields + ["application_form"]

# operations/api.py:88
class ClientSerializer(PersonSerializer):
    class Meta(PersonSerializer.Meta):
        model = Client
```

BranchSerializer declares fields public_id, state_code, display_name. PersonSerializer
declares public_id, name, state_code, active. ApplicationSerializer declares
public_id, state_code, status, submitted_at. Preserve their exact source/read-only
settings and class names; changing names can change generated OpenAPI components.

Existing exemplars: operations/application_serializers.py and
operations/document_serializers.py contain only serializers. AGENTS.md requires
explicit ModelSerializer Meta.fields; docs/api-conventions.md promises current
scoping, pagination, and original version-bound application data. Keep those intact.
accounts/contracts.py already contains only schema serializers and need not move.

## Commands you will need

From backend/ in PowerShell:

| Purpose | Command | Expected result |
| --- | --- | --- |
| Backend tests | `./venv/Scripts/python.exe -m pytest` | All pass |
| Focused representation/permission tests | `./venv/Scripts/python.exe -m pytest apps/accounts/tests apps/operations/tests apps/core/tests -q` | All pass |
| Check imports/URLs | `./venv/Scripts/python.exe manage.py check` | Exit 0, no errors |
| Before schema | `./venv/Scripts/python.exe manage.py spectacular --file .local/cleanup-002-before.yaml --validate --fail-on-warn` | Exit 0 |
| After schema | `./venv/Scripts/python.exe manage.py spectacular --file .local/cleanup-002-after.yaml --validate --fail-on-warn` | Exit 0 |
| Compare, still backend/ | `git diff --no-index -- .local/cleanup-002-before.yaml .local/cleanup-002-after.yaml` | Exit 0, identical schema |
| Frontend gates, from frontend/ | `npm.cmd run format:check`, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test` | Each exits 0 |
| Whitespace, from root | `git diff --check` | Exit 0 |

Interpreter and pytest availability, manage.py, frontend script definitions and
executables were checked during planning. Existing spectacular invocation is
documented in README.md. No install, migration, or seed is needed. Backend lint
and format are intentionally not configured.

## Scope

Only these files may change:

- backend/apps/accounts/views.py and serializers.py.
- backend/apps/operations/api.py, onboarding_api.py, public_content.py,
  application_serializers.py.
- New backend/apps/operations/job_serializers.py, person_serializers.py,
  onboarding_serializers.py, content_serializers.py.
- plans/README.md plan 002 status/results.

Out of scope: URLs, queryset/permission logic, services, models/migrations,
core health schema, account schema contracts, ApplicationInput relocation (plan
003), new endpoints, frontend, and new tests that only mirror class placement.
Preserve imports required by surviving views; remove only genuinely unused ones.

## Git workflow

Use a feature branch such as feat/backend-cleanup-serializers after plan 001 has
landed in the executor's working branch. Commit in logical slices with messages
such as `Separate job and directory serializers from API views`. Preserve unrelated
dirty files; no push or PR is included.

## Steps

### Step 1: Capture existing behavior and the API schema

Read all four source modules and existing serializer modules. Run focused tests,
manage.py check, and before-schema generation. Use ignored .local evidence paths
only after confirming they do not overwrite existing evidence; choose a fresh
suffix if needed. Do not read or copy unrelated private local data.

**Verify:** each baseline command exits 0. A pre-existing failure is reported,
not repaired by changing API fields or weakening schema validation.

### Step 2: Extract the eight classes to the mapped modules

Move class bodies verbatim apart from clear purpose comments. Adjust imports:
accounts/serializers.py needs StateBranch; job_serializers.py needs JobPosting and
FormVersionSerializer; person_serializers.py needs Caregiver and Client;
application_serializers.py already has CaregiverApplication. The onboarding
schema needs rest_framework.serializers, and content serialization needs BranchContent.
Import the moved classes in the original view modules at module scope.

Keep dependency direction one-way: views import serializers; serializers must
not import views or API modules. Keep JobDetailSerializer and ClientSerializer
inheritance intact. Do not leave compatibility class definitions in the views.
Use comments for purpose explanations where class docstrings would alter schema
descriptions. Adding imports here must not trigger database writes.

**Verify:** run manage.py check and focused tests after each coherent extraction.
From root run:

```powershell
rg -n '^class (BranchSerializer|JobSerializer|JobDetailSerializer|PersonSerializer|ClientSerializer|ApplicationSerializer|OnboardingOutput|BranchContentSerializer)\b' backend/apps/accounts/views.py backend/apps/operations/api.py backend/apps/operations/onboarding_api.py backend/apps/operations/public_content.py
```

Expect no matches (rg exit 1). Searching those class names under the destination
modules must find one definition of each, with all eight names represented.

### Step 3: Prove schema and client behavior are unchanged

Generate the after-schema, compare it with the before-schema, and run full backend
and frontend gates. Review each moved body against its previous definition.

**Verify:** schema comparison exits 0; all repository gates pass; git diff --check
passes; git diff --name-only contains only allowed changes beyond the initial
working state. Update plan 002 in the index with the actual results.

## Test plan and done criteria

Reuse existing public job/content, application, branch/ownership, onboarding, and
download tests. These exercise public contracts more meaningfully than a test
asserting a class's filename. No new behavioral test is required for moving classes.

- [ ] Eight classes have one definition each in dedicated serializer modules.
- [ ] Four audited view modules contain none of those class definitions.
- [ ] No destination serializer imports a view/API module.
- [ ] Generated OpenAPI is identical; fields, sources and inherited models match.
- [ ] Full backend/frontend gates and Django check pass; index updated honestly.

## STOP conditions

Stop if schemas differ, imports become circular, the move requires a new
dependency or endpoint change, baseline tests fail, or a scoped verification
remains broken after two reasonable attempts. Do not hide schema differences
with renamed components or configuration changes. Report unexpected consumers
outside scope before editing them.

## Maintenance notes

New serializers belong beside their feature's existing serializer modules. API
and onboarding_api remain valid view-module names. Keep the small modules small;
do not replace this extraction with a generic serializer registry or an unrelated
package-wide reorganization.
