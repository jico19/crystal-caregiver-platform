# Plan 001: Place account and core tests in their apps' test folders

## Implementation record ? completed 2026-11-09

The owner subsequently requested focused verification rather than running all
suites. This record supersedes the blanket gates in the archived plan below.

- Account tests now live in backend/apps/accounts/tests/test_foundation.py;
  core tests live in backend/apps/core/tests/test_core.py. Both packages have
  initializers. All four operations test consumers use the new account test path.
- All 127 existing parametrized cases collect exactly once. Moved test and fixture
  bodies were compared with the original ASTs and are unchanged.
- No behavioral tests were added for file placement. Existing tests are preserved.
- Commit: 5e56733. Later explanations are comments only.

> Executor: complete the steps and verification gates in order. Update this plan's
> row in plans/README.md with results. This document authorizes no unrelated work.
>
> Drift check, from the repository root:
> `git diff --stat c918fd4..HEAD -- backend/apps/accounts backend/apps/core backend/apps/operations/tests`
> Also run `git status --short` and inspect uncommitted differences. If the excerpts
> below no longer match, stop and reconcile before moving files.

## Status

- Priority: P2
- Effort: S
- Risk: MED — relative imports and cross-app pytest fixture discovery can break.
- Depends on: none
- Category: tests / tech-debt
- Planned at: commit `c918fd4`, 2026-11-09

## Why this matters

AGENTS.md requires backend tests under the owning app's tests/ folder. Accounts
and core still keep test files beside production modules. Moving them must not
silently drop security tests or change autouse fixture behavior in operations.

## Current state

- `backend/apps/accounts/test_foundation.py:30` imports `from .models import User, Invitation`.
  Moving the file one package deeper requires `from ..models import User, Invitation`.
- That module defines UserFactory, config, graph, browser, csrf, application_data,
  and eleven test functions. Some are parametrized, so collected cases exceed
  the function count. Preserve `pytestmark = pytest.mark.django_db`.
- At line 43 it has `@pytest.fixture(autouse=True)` on config; graph is also a
  pytest fixture. Preserve the fixture scopes, settings overrides, cache reset,
  temporary private-file root, and local-memory email transport.
- `backend/apps/core/tests.py:10` starts four core tests, including a private
  test-only APIView nested inside a test. That test double belongs in test code.
- Four operation test consumers import the old account module:
  `tests/conftest.py:2`, `tests/test_applications.py:2`,
  `tests/test_onboarding.py:8`, and `tests/test_onboarding_permissions.py:3`.

Existing exemplar: backend/apps/operations/tests/__init__.py and test_integrity.py
already demonstrate a dedicated test package. docs/architecture.md assigns auth
to accounts and branch-scoped workflows to operations; no new app is needed.

## Commands you will need

PowerShell, from backend/ unless otherwise marked. The local interpreter and
pytest were verified (Python 3.14.4, pytest 9.2.0).

| Purpose | Command | Expected result |
| --- | --- | --- |
| Collect baseline | `./venv/Scripts/python.exe -m pytest --collect-only -q` | Exit 0; record test IDs and total |
| Focused tests before move | `./venv/Scripts/python.exe -m pytest apps/accounts/test_foundation.py apps/core/tests.py apps/operations/tests -q` | All pass |
| Focused tests after move | `./venv/Scripts/python.exe -m pytest apps/accounts/tests apps/core/tests apps/operations/tests -q` | All pass |
| Full backend gate | `./venv/Scripts/python.exe -m pytest` | All pass; no lost or duplicate cases |
| Django imports and URLs | `./venv/Scripts/python.exe manage.py check` | Exit 0; no errors |
| Full frontend gates, from frontend/ | `npm.cmd run format:check`, then `npm.cmd run lint`, then `npm.cmd run typecheck`, then `npm.cmd run test` | Each exits 0 |
| Diff whitespace, from root | `git diff --check` | Exit 0 |

Backend lint/format: not configured by owner request. Do not install or configure
them. Do not run migrations, seeding, or installs for a file move.

## Scope

Only these files may change:

- Move backend/apps/accounts/test_foundation.py to
  backend/apps/accounts/tests/test_foundation.py.
- Create backend/apps/accounts/tests/__init__.py.
- Move backend/apps/core/tests.py to backend/apps/core/tests/test_core.py.
- Create backend/apps/core/tests/__init__.py.
- Update imports in backend/apps/operations/tests/conftest.py,
  test_applications.py, test_onboarding.py, and test_onboarding_permissions.py.
- Update the plan 001 status and verification record in plans/README.md.

Out of scope: production Python, test configuration, factory extraction, fixtures'
behavior, migrations, frontend files, and rewriting test assertions. Keep shared
helpers in the moved account test module for this minimal relocation.

## Git workflow

Use a feature branch such as feat/backend-cleanup-tests. Preserve existing dirty
files. Commit the completed relocation and its import changes together, for
example `Move account and core tests into dedicated test packages`. Do not push
or open a PR without a separate instruction.

## Steps

### Step 1: Establish discovery and security-test baselines

Read the files listed above and run collection and the focused pre-move command.
Record collected node IDs and their count in an ignored local evidence file or
executor notes; record no payloads or credential values. Use pytest.ini as the
effective config; do not reconcile its existing duplication with pyproject.toml.

**Verify:** baseline collection and focused tests above both exit 0. If they fail,
report the baseline failure rather than changing unrelated code.

### Step 2: Move both files and update every affected import atomically

Create the two test packages and move the files to their exact destinations.
Remove the old files so core/tests.py does not shadow core/tests/. Change the
account file's relative model import to `..models`. Replace
`apps.accounts.test_foundation` with `apps.accounts.tests.test_foundation` in all
four operations consumers. Preserve their imported symbol lists, including
config and graph, so pytest still registers the same fixtures.

Add concise comments for the changed import blocks explaining that shared
synthetic fixture helpers now live in the account test package. Do not copy the
factory or introduce production imports of test modules.

**Verify:** run post-move focused tests, manage.py check, and collection. Counts
must match the baseline, with only these node-ID prefixes changed:

- apps/accounts/test_foundation.py -> apps/accounts/tests/test_foundation.py
- apps/core/tests.py -> apps/core/tests/test_core.py

All operations IDs and parameter suffixes must remain identical. From root, run
`rg -n 'apps\.accounts\.test_foundation' backend/apps -g '*.py'`; expect no
matches (rg exit 1 means the old import is absent).

### Step 3: Verify placement and complete the repository gates

From root run this read-only placement check; it covers tracked source and newly
created app test files and excludes no app code:

```powershell
@'
from pathlib import Path
bad = [str(p) for p in Path('backend/apps').rglob('*.py')
       if (p.name == 'tests.py' or p.name.startswith('test_') or p.name.endswith('_tests.py'))
       and 'tests' not in p.parts and '__pycache__' not in p.parts]
assert not bad, bad
print('PASS: backend app tests are inside tests folders')
'@ | backend/venv/Scripts/python.exe -B -
```

**Verify:** placement check prints PASS; full backend and frontend gates pass;
git diff --check exits 0. Compare the final diff with the initial dirty status;
only the listed cleanup files and plan status should be newly changed.

## Test plan and done criteria

No new behavioral tests: this is a relocation of existing coverage. Preserve all
anonymous denial, CSRF, ownership, agency/branch isolation, invitation, and reset
tests in test_foundation.py. The concrete regression signal is unchanged
collection after prefix normalization plus passing tests in isolation and together.

- [ ] Old test files and old import references are absent.
- [ ] Every former test case is collected once at the intended new path.
- [ ] Focused, full backend, Django, and frontend gates pass.
- [ ] Only scoped changes are committed; plans/README.md reports actual results.

## STOP conditions

Stop if discovery gains or loses cases, fixtures disappear when a test file is
run alone, a dependency or configuration change seems necessary, an unrelated
security test fails, or a gate still fails after two reasonable scoped attempts.
Never fix this by disabling tests, changing assertions, or enabling external mail.

## Maintenance notes

Future helpers must stay in test folders. Extract shared helpers only when a
separate change needs it. Renames can affect pytest node-ID references in external
scripts; the four known source consumers are included here. Review fixture
registration carefully before treating this as a simple filesystem move.
