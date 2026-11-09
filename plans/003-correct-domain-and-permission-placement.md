# Plan 003: Put application validation and permissions in their owning modules

## Implementation record ? completed 2026-11-09

The owner's later folder requirement and focused-verification request supersede
the original destinations and blanket test gates in the archived plan below.

- ApplicationInput now lives in operations/serializers/applications.py and reuses
  PasswordInput from accounts/serializers/inputs.py. Its complete class body is
  unchanged; the operations API imports it from its owning domain.
- IsBusinessAdmin now lives in accounts/permissions.py. All three consumers use
  that module. admin_branches and scope_people remain in access.py.
- The permission class body, all named serializer bodies and generated OpenAPI
  match the originals. Django system checks pass; no access-policy changes.
- Commits: a147912 and 6db70ab. No new tests or dependency changes.

> Executor: run the steps and verification gates, then update plan 003 in
> plans/README.md. From root run:
> `git diff --stat c918fd4..HEAD -- backend/apps/accounts backend/apps/operations`
> Inspect working diffs too. Plans 001 and 002 intentionally changed test paths
> and serializer imports. Reconcile those expected differences; stop on others.

## Status

- Priority: P2
- Effort: S
- Risk: MED — permission imports must change without altering access policy.
- Depends on: plans 001 and 002
- Category: tech-debt
- Planned at: commit `c918fd4`, 2026-11-09

## Why this matters

ApplicationInput validates operations-specific caregiver application data inside
accounts. IsBusinessAdmin is a permission class inside access.py, while AGENTS.md
assigns permission classes to permissions.py. Correct their ownership without
changing the shared account/password helpers or branch-scoping policy.

## Current state

```python
# backend/apps/accounts/serializers.py:31
class ApplicationInput(PasswordInput):
    experience = serializers.CharField(required=False)
    availability = serializers.ListField(child=serializers.CharField(), required=False)
    name = serializers.CharField(max_length=200)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)
    demo_acknowledged = serializers.BooleanField()

# backend/apps/accounts/access.py:28
class IsBusinessAdmin(BasePermission):
    def has_permission(self, request, view):
        return admin_branches(request.user).exists()

    def has_object_permission(self, request, view, obj):
        return admin_branches(request.user).filter(pk=obj.branch_id).exists()
```

ApplicationInput also rejects a false demo acknowledgement and requires a password
for anonymous applicants. Its only production consumer is operations/api.py:12.
PasswordInput and StrictSerializer remain reusable account validation primitives.
operations/document_serializers.py already imports StrictSerializer from accounts;
match that one-way dependency rather than copying password validation.

IsBusinessAdmin is imported by accounts/views.py, operations/api.py, and
operations/onboarding_api.py. Other services import admin_branches/scope_people
from access.py; those imports should remain valid and unchanged.

docs/architecture.md says: accounts owns authentication/invitations; operations
holds branch-scoped domain workflows. admin_branches includes active agency
admins and administrator assignments, not ordinary staff or Django admin flags.
This documented policy must remain identical. The existing operations filters.py
is an exemplar for separating an explicit framework responsibility into its own file.

## Commands you will need

PowerShell commands from backend/ unless noted:

| Purpose | Command | Expected result |
| --- | --- | --- |
| Imports/URLs | `./venv/Scripts/python.exe manage.py check` | Exit 0, no errors |
| Focused access/application tests | `./venv/Scripts/python.exe -m pytest apps/accounts/tests apps/operations/tests/test_applications.py apps/operations/tests/test_onboarding_permissions.py -q` | All pass |
| Full backend gate | `./venv/Scripts/python.exe -m pytest` | All pass |
| Before schema | `./venv/Scripts/python.exe manage.py spectacular --file .local/cleanup-003-before.yaml --validate --fail-on-warn` | Exit 0 |
| After schema | `./venv/Scripts/python.exe manage.py spectacular --file .local/cleanup-003-after.yaml --validate --fail-on-warn` | Exit 0 |
| Schema comparison | `git diff --no-index -- .local/cleanup-003-before.yaml .local/cleanup-003-after.yaml` | Exit 0 |
| Frontend gates, from frontend/ | `npm.cmd run format:check`, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test` | Each exits 0 |
| Whitespace, from root | `git diff --check` | Exit 0 |

Python/pytest, manage.py and frontend commands were verified available during
planning. Schema invocation is documented in README.md. No installs, migrations,
seeding, new linter, or new formatter are needed; backend lint/format are not configured.

## Scope

Only these files may change:

- backend/apps/accounts/serializers.py, access.py, views.py.
- New backend/apps/accounts/permissions.py.
- backend/apps/operations/application_serializers.py, api.py, onboarding_api.py.
- plans/README.md plan 003 status/results.

Out of scope: role rules, scoping queries, invitations, login/session/CSRF behavior,
password validators, model/migration changes, serializers other than the moved
ApplicationInput, frontend, and mass renaming schema-only contracts. No compatibility
re-export is needed for internal imports when every consumer is updated together.

## Git workflow

Use a feature branch such as feat/backend-cleanup-placement based on the completed
plans 001–002. Commit the application move and permission move as small coherent
units, for example `Place application validation in operations`. Preserve existing
dirty files. No push or PR is included.

## Steps

### Step 1: Confirm consumers and establish contract baselines

From root run `rg -n 'ApplicationInput|IsBusinessAdmin' backend/apps -g '*.py'`.
At baseline there should be one definition of each and only the production
consumers listed above. Account tests have moved under tests/ after plan 001.
Run focused tests and generate the before-schema to a fresh ignored evidence file.

**Verify:** all expected consumers are accounted for, tests pass, schema validates.
Unexpected consumers require a scope review before proceeding.

### Step 2: Relocate ApplicationInput without changing validation

Move the complete ApplicationInput class to operations/application_serializers.py.
Import PasswordInput from apps.accounts.serializers there; reuse the existing
rest_framework.serializers import. Switch operations/api.py to import
ApplicationInput from its own application_serializers module. Keep field order,
required flags, password handling, context usage, messages, and overrides unchanged.
Do not move PasswordInput, StrictSerializer, or model-specific User validation.
Add a purpose comment describing the synthetic caregiver application input.

**Verify:** manage.py check and the focused application/access command pass.
`rg -n '^class ApplicationInput' backend/apps -g '*.py'` from root finds exactly
one definition in operations/application_serializers.py.

### Step 3: Relocate IsBusinessAdmin without changing authorization

Create accounts/permissions.py, import BasePermission and admin_branches, and move
the class there verbatim with a purpose comment. Keep admin_branches and
scope_people in access.py. Remove the now-unused BasePermission import from
access.py. Update all three consumers to import the class from accounts.permissions,
while retaining their admin_branches/scope_people imports from access.py.
Do not add different superuser checks, membership fallback, new role logic, or
permission caching.

**Verify:** manage.py check and the focused access/application tests pass. From
root, `rg -n '^class IsBusinessAdmin' backend/apps -g '*.py'` finds exactly one
definition in accounts/permissions.py. Review every IsBusinessAdmin reference:
none may import it from access.py, including multiline imports.

### Step 4: Check the public contract and complete all repository gates

Generate the after-schema and compare it to this plan's baseline. Run the full
backend/frontend gates and whitespace check.

**Verify:** identical schema and all passing gates. Review git diff --name-only
against the initial dirty state; only scoped cleanup files may be newly modified.
Record verification and status in plans/README.md.

## Test plan and done criteria

No new endpoint or changed policy is introduced. Reuse existing forged-field,
anonymous denial, owner-only, inactive membership, wrong-state, wrong-agency,
ordinary-staff, and Django-admin-flag tests. A test asserting a class's module
name would merely mirror implementation and is not required.

- [ ] ApplicationInput exists only in operations/application_serializers.py.
- [ ] IsBusinessAdmin exists only in accounts/permissions.py.
- [ ] All consumers use the new definitions and queries remain unchanged.
- [ ] Schema, full backend/frontend, and Django checks pass; index is updated.

## STOP conditions

Stop if this requires changing auth/session/role behavior (ask the owner before
such a change), introduces a circular dependency, changes validation/schema,
reveals an unlisted consumer, or a verification gate fails twice after reasonable
scoped attempts. Do not duplicate classes to bypass import problems.

## Maintenance notes

The new permission module depends on access.py, never the reverse. Account
validation helpers may be shared across operations serializers without transferring
ownership of the operation's schema back into accounts. This plan does not require
renaming every specialized serializer module or reorganizing Django apps.
