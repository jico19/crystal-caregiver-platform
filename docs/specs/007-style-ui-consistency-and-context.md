# 007: Make style, UI primitives, and architecture guidance consistent

Status: Complete. Priority: P3. Audit findings: F8, F9, F10.
Completed: 2026-11-09.
Deliver Python tooling, UI consistency, and documentation as separate slices.

## Problem and outcome

Python has inconsistent import placement, spacing, and long lines without a
committed checker. Tailwind semantic tokens coexist with hardcoded primitive
styles and repeated overrides. Frontend context still describes a FastAPI backend
although the repository uses Django/DRF. Future changes need one accurate guide
and repeatable, limited checks.

## Python style requirements

- Add a committed development style-check dependency and configuration, using
  pycodestyle with PEP 8 defaults as the proposed minimal choice. Keep tooling
  dependencies separate from runtime requirements when practical.
- Apply the [PEP 8 guide](https://peps.python.org/pep-0008/): four spaces,
  grouped module imports, two blank lines around top-level definitions, normal
  79-character code lines, and 72-character comment/docstring lines.
- Enforce comment/docstring line length explicitly if the selected checker does
  not enable that check by default. Document the exact repeatable command.
- Establish a documented legacy baseline without disabling rules globally.
  Check and clean Python files touched by the workflow specs first. Generated
  migrations, environments, and caches are outside the initial cleanup scope.
- Move late imports only after checking for circular dependencies. A required
  local import may retain an explained, narrow exception.
- Keep formatting-only changes separate from behavior changes. No repository-wide
  reformat or unrelated naming/API change is required.

## UI consistency requirements

- Scope the first migration to `frontend/src/index.css`, UI Button/Input,
  shared ConfirmModal, and the referrals search control.
- Use both `tailwind-design-system` and `design-taste-frontend` for this slice.
  Maintain the current brand, compact portal layout, and readable status colors.
- Define one authoritative set of semantic brand/surface/border/focus tokens.
  Resolve duplicate semantic definitions deliberately; preserve any still-used
  compatibility variables until their consumers migrate.
- Button/Input variants consume semantic tokens. ConfirmModal uses Button
  variants without repeating the default primary palette. Referral search uses
  the shared Input while preserving its search icon, label, and dimensions.
- Keep meaningful status colors and feature-specific layout utilities. Do not
  replace every palette class mechanically or expand this into a theme redesign.
- Preserve keyboard focus visibility, disabled/loading interaction, destructive
  distinction, accessible names, and contrast on the affected controls.

## Architecture context requirements

- Correct `frontend/CONTEXT.md` to describe Django/DRF, backend/apps,
  config/settings, current authentication, and environment-driven deployment
  options verified from the repository.
- Replace obsolete Pydantic/FastAPI source pointers in
  `frontend/src/shared/utils/validation.js` with existing Django serializer/service
  references or remove unsupported equivalence claims.
- Preserve useful frontend component and role/state guidance after checking it
  against current routes and helpers. Do not claim frontend schemas fully mirror
  backend validation unless that has been verified.

## Acceptance criteria

- [x] Python style tooling has a committed dependency/configuration and documented
  command; changed non-generated Python files pass the agreed checks.
- [x] Legacy violations are distinguishable from new violations without broad
  rule suppression or a repository-wide formatting diff.
- [x] Targeted UI primitives use shared semantic definitions, and duplicate primary
  styling is removed from ConfirmModal.
- [x] The migrated search retains current filtering and accessible interaction.
- [x] Affected control states and layouts preserve appearance and usability.
- [x] Architecture guidance references existing modules and the actual backend.

## Focused validation

For Python formatting, run the configured style command on changed files;
workflow tests are needed only if imports or behavior change. Once configured,
the proposed base command is `python -m pycodestyle <changed files>` with the
committed configuration supplying any additional checks.

For UI changes, run `npm run lint` and `npm run build`; compare normal, hover,
focus, disabled, loading, and destructive states at narrow and desktop widths.
Check theme behavior only for themes actually exposed by the application.
For documentation-only changes, verify paths and claims directly; skip tests.

## Completion and validation

- Added separate pycodestyle development requirements, configuration, a strict
  clean-file manifest, and [repeatable commands](../development/python-style.md).
  All 16 workflow Python files pass. The exact legacy baseline records 800
  remaining findings in 76 untouched files without suppressing checker rules.
- Consolidated semantic tokens and migrated Button, Input, ConfirmModal, and
  referral search while preserving layout, status colors, focus, and pending
  interaction. Primary green was darkened for readable small white labels.
- Corrected frontend architecture/authentication/deployment guidance and source
  comments against Django modules; removed unsupported validation-parity claims.
- Validation: frontend lint/build passed with the same four existing lint
  warnings; focused backend tests passed (82 tests, 139 subtests). Browser
  filtering, control-state, keyboard, desktop/narrow layout, and scoped dialog
  accessibility checks passed. Python executable bodies retain AST parity with
  the task-start snapshot, excluding the reviewed imports/docstrings.
- See the [validation report and screenshots](../reviews/007-style-ui-consistency-and-context.md)
  for commands, evidence, scope, and limitations. Changes are prepared in the
  working tree; no Git commit was created.
