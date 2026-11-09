# Spec 007 validation

Completed 2026-11-09 in three scoped slices: Python style tooling/cleanup,
semantic UI controls, and architecture documentation. Existing workflow edits
were preserved; no commits, migrations, or runtime dependency upgrades were made.

## Python tooling and cleanup

- Added `backend/requirements-dev.txt` with pycodestyle 2.15.0 and
  `backend/setup.cfg` with 79-character code / 72-character prose limits.
  Default rule selection remains intact; no global rule ignores were added.
- Cleaned the 16 workflow files listed in `backend/style-clean-files.txt`.
  Generated migrations, environments, caches, and unrelated source files
  remain outside this cleanup. Exact commands and adoption policy are in
  [the Python style guide](../development/python-style.md).
- Grouped imports and moved late view/test imports after inspecting their
  dependencies. The relevant care/authorization serializers depend on models,
  not these importing views; tests confirmed successful eager initialization.
  Removed duplicate imports and the unused local `ClientSerializer` import.
  No required local import or checker suppression remains in the cleaned scope.
- Compared all 16 files against a task-start snapshot with AST normalization
  limited to imports and docstrings. Executable bodies, literals, canonical
  hash inputs, and payload values remained identical. Long executable strings
  were split using implicit concatenation without changing their values.
- Recorded [800 legacy findings in 76 untouched files](007-python-style-baseline.txt).
  A full recursive scan matched that snapshot exactly. The snapshot does not
  suppress failures; changed files must pass their strict independent check.

Validation from `backend/`, using the project virtual environment:

```powershell
python -m pycodestyle (Get-Content style-clean-files.txt)
python -m pytest apps/admin_portal/tests.py apps/caregivers/tests.py apps/clients/tests.py apps/documents/tests.py -q
```

Style passed with no findings. Workflow tests passed: **82 tests and 139
subtests**. Tests were relevant because module import timing changed. Test
bytecode changes were removed/restored after validation.

## UI controls

Applied the semantic token hierarchy and component/state guidance from
`tailwind-design-system` and `design-taste-frontend` to the existing clinical
portal. This slice retains the compact layout; marketing-page hero, asset,
and full-screen-section checks do not apply to this control migration.

`index.css` now has one semantic value set, mapped through `@theme inline`.
Legacy layout aliases resolve to that same set. Removed conflicting root
secondary/accent definitions after checking consumers; shell text formerly
using the secondary surface name now uses an explicit text token. Kept
compatibility variables and meaningful status colors.

Button variants consume semantic primary, destructive, surface, border,
hover, and focus tokens. The green primary is now green 700 (#15803d), with
a darker hover, so small white labels meet 4.5:1 contrast. Input consumes
shared surface, text, placeholder, border, and focus values. ConfirmModal
uses its existing Button variant without repeating an emerald palette.
Referral search uses Input, keeps its 32px height and icon spacing, and has
an explicit accessible name matching its existing placeholder.

Frontend lint and production build passed using `npm.cmd run lint` and
`npm.cmd run build`. Lint retains the same four existing warnings in
`PublicLayout.jsx`, `tabs.jsx`, `button.jsx`, and `badge.jsx`.

Browser checks used an isolated agent-browser session with synthetic users
and two synthetic referrals. The actual referral page ran against controlled
fetch responses; a temporary harness rendered the actual shared controls.
The harness was removed after review.

- [13 recorded search assertions](007-style-ui-consistency-and-context/search-checks.json)
  passed: dimensions/icon, accessible focus, trimmed case-insensitive name,
  phone/email/source filtering, local search, no matches, reset, table-view
  filtering, and narrow layout.
- [18 recorded control assertions](007-style-ui-consistency-and-context/control-checks.json)
  passed: normal label contrast, primary/destructive distinction, sizes,
  disabled/loading interaction, focus, dialog semantics, shared variant use,
  narrow dialog layout, and blocked Escape/cancel/confirm while pending.
  Additional live checks verified outline/secondary/ghost/link hover,
  narrow Input focus, desktop pending dialog layout, and 1024/768px layouts.
- The shared dialog's [scoped accessibility audit](007-style-ui-consistency-and-context/dialog-accessibility.json)
  reported **0 violations and 0 incomplete checks**.

Inspected screenshots:

| Surface | Desktop | Narrow |
| --- | --- | --- |
| Referral search | [Focused table search](007-style-ui-consistency-and-context/referral-desktop-focus.png) | [Reset pipeline](007-style-ui-consistency-and-context/referral-mobile.png) |
| Shared controls | [Variants and disabled states](007-style-ui-consistency-and-context/controls-desktop.png) | [Input keyboard focus](007-style-ui-consistency-and-context/controls-mobile-focus.png) |
| Confirmation | [Primary dialog](007-style-ui-consistency-and-context/confirm-desktop.png) | [Destructive dialog](007-style-ui-consistency-and-context/destructive-mobile.png) |
| Pending confirmation | [Desktop](007-style-ui-consistency-and-context/loading-desktop.png) | [Narrow](007-style-ui-consistency-and-context/loading-mobile.png) |

Desktop screenshots use 1440x900; narrow screenshots use 390x844. No page
overflow was observed. Existing CSS dark overrides remain, but no theme
switch is exposed, so no claim of full dark-theme support is made. The
controlled browser checks establish frontend behavior, not production API
or S3 behavior.

## Architecture guidance

Replaced `frontend/CONTEXT.md` with verified Django/DRF module locations,
SimpleJWT/session behavior, settings/deployment switches, routes/layouts,
role/state permissions, and current shared component/hook guidance. Removed
nonexistent specification/source pointers and unsupported claims about
validation parity, uniform 403 responses, and guaranteed durable auditing.
Updated the source comments in `validation.js` and `roles.js` to existing
Django serializers/services and permission/mixin modules. Documentation paths
and claims were checked directly against the repository; no documentation-only
test suite was added.
