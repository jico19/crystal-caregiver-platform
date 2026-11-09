# Plan 004: Delegate password-reset confirmation to an account service

## Implementation record ? completed 2026-11-09

The owner limited this work to organization and requested no unnecessary tests.
This record supersedes the proposed new characterization suite and full-suite
repetition in the archived plan below. No new test file was added.

- confirm_reset(data) in accounts/services.py owns the original account lookup,
  token check, password mutation and audit sequence. ResetConfirmView validates
  the input, delegates to that service and returns the original response.
- AST comparison confirms the extracted workflow is identical to the original
  handler statements; no transaction, token, session or error policy changed.
- Existing test_reset_is_generic_and_token_is_single_use passed:
  `./venv/Scripts/python.exe -m pytest apps/accounts/tests/test_foundation.py -k reset -q --basetemp .local/pytest-cleanup-reset-20261109`
  Result: 1 passed, 14 deselected. The workspace temp directory avoided Windows
  access denial in pytest's default temp directory.
- Django system checks and validated schema parity pass. Commit: a147912.
- Input serializers now reside in accounts/serializers/inputs.py after the
  subsequent folder cleanup; public input fields and output are unchanged.

> Executor: follow the steps and verification gates. Update plan 004 in
> plans/README.md. From root run:
> `git diff --stat c918fd4..HEAD -- backend/apps/accounts backend/apps/operations/api.py backend/apps/operations/onboarding_api.py`
> Inspect working diffs too. Plans 001–003 intentionally moved tests, serializers,
> ApplicationInput, and IsBusinessAdmin. Accept those documented differences;
> reconcile anything else before proceeding.

## Status

- Priority: P2
- Effort: S
- Risk: MED — this touches password-reset internals despite preserving behavior.
- Depends on: plans 001, 002, 003
- Category: tech-debt
- Planned at: commit `c918fd4`, 2026-11-09

## Why this matters

ResetConfirmView currently resolves accounts, verifies tokens, writes a password,
and records an audit event. AGENTS.md assigns that orchestration to services.
Extract the existing behavior so the view only validates input, invokes the
service, and builds the same response. Characterization tests must precede the move.

## Current state

`backend/apps/accounts/views.py:146` currently contains:

```python
def post(self, request):
    data = self.input(request, ResetConfirmInput)
    try:
        user = User.objects.get(pk=urlsafe_base64_decode(data["uid"]).decode(), is_active=True)
    except User.DoesNotExist, ValueError, UnicodeError, OverflowError:
        raise ValidationError("Reset link is invalid or expired.")
    if not default_token_generator.check_token(user, data["token"]):
        raise ValidationError("Reset link is invalid or expired.")
    user.set_password(data["password"])
    user.save(update_fields=["password"])
    audit(user, "password.reset", uuid.uuid5(uuid.NAMESPACE_OID, str(user.pk)))
    return Response({"detail": "Password updated. Sign in with your new password."})
```

The exception syntax is valid for the pinned Python 3.14.4. Do not rewrite it
because an older local interpreter cannot parse it.

Other relevant files:

- accounts/services.py:142 has request_reset(email), which creates the existing
  token link through the configured local/test email transport.
- accounts/serializers.py:66 has ResetConfirmInput, inheriting password validation
  from PasswordInput. Input validation stays in the serializer.
- accounts/test_foundation.py:329 currently has
  test_reset_is_generic_and_token_is_single_use. After plan 001 its path is
  accounts/tests/test_foundation.py. Keep that test intact.
- accounts/services.py:59 and 87 show invitation workflows in services; at
  accounts/views.py:115 the view calls invite(...) and constructs a response.
  Match that delegation boundary, not a service that accepts an HTTP request.

docs/architecture.md specifies Django sessions plus CSRF; docs/api-conventions.md
specifies the existing structured API errors. Existing reset confirmation does
not sign the caller in. Keep reset lifetime configuration, response/error shape,
token invalidation, session behavior, and audit action/resource identity unchanged.

## Commands you will need

PowerShell, from backend/ unless otherwise stated:

| Purpose | Command | Expected result |
| --- | --- | --- |
| Existing reset coverage | `./venv/Scripts/python.exe -m pytest apps/accounts/tests/test_foundation.py -k reset -q` | All selected tests pass |
| New characterization coverage | `./venv/Scripts/python.exe -m pytest apps/accounts/tests/test_password_reset.py -q` | All pass before and after extraction |
| Full account suite | `./venv/Scripts/python.exe -m pytest apps/accounts/tests -q` | All pass |
| Full backend gate | `./venv/Scripts/python.exe -m pytest` | All pass |
| Django check | `./venv/Scripts/python.exe manage.py check` | Exit 0, no errors |
| Before schema | `./venv/Scripts/python.exe manage.py spectacular --file .local/cleanup-004-before.yaml --validate --fail-on-warn` | Exit 0 |
| After schema | `./venv/Scripts/python.exe manage.py spectacular --file .local/cleanup-004-after.yaml --validate --fail-on-warn` | Exit 0 |
| Schema comparison | `git diff --no-index -- .local/cleanup-004-before.yaml .local/cleanup-004-after.yaml` | Exit 0 |
| Frontend gates, from frontend/ | `npm.cmd run format:check`, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test` | Each exits 0 |
| Whitespace, from root | `git diff --check` | Exit 0 |

Python/pytest and the frontend script executables were verified available during
planning. Schema invocation is in README.md. Backend lint/format are not configured
by owner request. No installation, migration, or seed command is needed.

## Scope

Only these files may change:

- backend/apps/accounts/services.py.
- backend/apps/accounts/views.py.
- New backend/apps/accounts/tests/test_password_reset.py.
- plans/README.md plan 004 status/results.

Out of scope: password validator policy, authentication backend, login/logout,
invitation flows, session settings, CSRF middleware, token lifetime, permissions,
models, migrations, frontend, and changing the existing foundation tests to hide
a failure. No new endpoints. No added transaction semantics or rollback policy
in this extraction: that would be a separate behavioral change requiring review.

## Git workflow

Use a feature branch such as feat/backend-cleanup-reset based on completed plans
001–003. Commit characterization tests separately before the extraction, for
example `Characterize password reset confirmation before service extraction`,
then `Delegate password reset confirmation to an account service`. Preserve
unrelated changes. No push or PR is included.

## Steps

### Step 1: Establish the existing reset and schema baselines

Run existing reset tests and Django check. Generate the before-schema using a
fresh ignored evidence path. Read PublicAuthView's csrf_protect decorator and
PasswordInput validation before writing tests.

**Verify:** baseline reset tests and schema/check commands exit 0. Report a
pre-existing failure rather than changing the policy to fit the cleanup.

### Step 2: Add API-level characterization tests before moving behavior

Create accounts/tests/test_password_reset.py. Reuse the same helper/fixture pattern
as the relocated foundation module:

```python
from apps.accounts.tests.test_foundation import config, graph, browser, csrf
```

Keep config and graph explicitly available to pytest. Mark database tests as the
foundation module does. Use synthetic users and generated tokens, the existing
CSRF-enabled browser helper, and locmem email only. For weak-password rejection,
temporarily use the existing MinimumLengthValidator through Django test settings;
do not modify application settings or introduce a new dependency. Add clear test
docstrings explaining each behavior's purpose.

Cover these externally observable cases:

1. Valid token changes the password, records one password.reset audit event with
   the same actor/resource identity, returns the current response, and creates no
   authenticated session for an anonymous caller.
2. Reusing a consumed token returns the existing 400 error and changes neither
   the password nor the number of password.reset audit events.
3. Invalid token, malformed UID, unknown account, and inactive account return the
   current generic invalid/expired error with no successful-reset audit.
4. Expired tokens are rejected using a controlled clock and configured timeout;
   use unittest.mock or Django override_settings, not sleeps or a new library.
5. Missing required input, an unsupported injected field, and a password rejected
   by the configured validator return 400 without password/audit changes.
6. An unsafe request with no valid CSRF token returns 403 and makes no changes;
   retain APIClient(enforce_csrf_checks=True), do not bypass middleware.

Inspect the existing AuditEvent model to build counts without printing tokens,
passwords, reset URLs, or payloads. Do not hard-code generated credential values
in evidence. Assert public status/error behavior, not a private helper's location.

**Verify:** the new characterization command and full account suite pass against
the original view. Commit this passing baseline before the extraction. If the
baseline contradicts a stated case, stop and report the discrepancy rather than
fixing behavior inside this plan.

### Step 3: Extract confirm_reset(data) and make the view delegate

Add confirm_reset(data) to accounts/services.py. Move the existing UID decode,
active account lookup, token check, set_password/save, and audit sequence into it.
It accepts the validated mapping, not request or Response. Keep the exact caught
exception types and validation messages. No login or session writes belong here.
Add a service docstring explaining the reset operation, token verification, and
audit purpose. Keep existing policy and operation ordering unchanged.

Import urlsafe_base64_decode into services.py alongside its existing encode
helper. It already imports User, default_token_generator, uuid, ValidationError,
and audit locally. Change ResetConfirmView.post to:

```python
data = self.input(request, ResetConfirmInput)
confirm_reset(data)
return Response({"detail": "Password updated. Sign in with your new password."})
```

Import confirm_reset with the other services. Remove only now-unused reset-specific
imports from views.py: default_token_generator, urlsafe_base64_decode, and User.
Keep uuid and ValidationError because other views still use them. Explain the
delegation with a brief comment; avoid a view docstring that changes API schema text.

**Verify:** characterization tests and full account tests pass unchanged;
manage.py check passes. Review ResetConfirmView.post: no account lookup, token
validation, password write, or audit write remains in that handler. The service
must not import accounts.views or use request/Response.

### Step 4: Prove contract parity and complete required gates

Generate and compare the after-schema; run full backend/frontend gates and
git diff --check. Review the diff for only the scoped production extraction and
test additions. Update plan 004's index row with the actual results.

**Verify:** schema is identical, every gate passes, and no session/auth setting or
unrelated source file changed.

## Test plan and done criteria

The new API tests above are necessary characterization for a sensitive workflow,
not tests of the refactor's implementation. Existing ownership/branch and
invitation tests must keep passing even though no endpoint is added here.

- [ ] New characterization cases pass both before and after the move.
- [ ] ResetConfirmView validates, delegates, and returns the current response only.
- [ ] confirm_reset contains the original workflow with a purpose docstring.
- [ ] Token use, invalid input, audit identity and CSRF behavior remain unchanged.
- [ ] Schema, full backend/frontend, Django, and whitespace gates pass.
- [ ] Changes stay within scope; the plan index reports actual results.

## STOP conditions

Stop if a baseline case fails, policy/transaction/session changes are needed,
the executor cannot run pinned Python 3.14, a new dependency seems necessary, or
a verification gate fails after two reasonable scoped attempts. AGENTS.md says
to ask first for auth or session changes: obtain owner direction before changing
behavior; moving the existing implementation is the only scope here.

## Maintenance notes

Keep password validation in serializers and reset orchestration in services.
Services should remain callable without constructing HTTP requests. Future changes
to token lifetime, session invalidation, concurrency, or transaction semantics
must be separately specified and verified; this plan makes no new guarantees.
