# Backend cleanup plans

Written on 2026-11-09 against commit `c918fd4`, using the `improve` skill.
All five cleanup slices are implemented on `feat/phase-1-prerequisites`.
These documents retain the original handoff details and record the final outcome.
The implementation amendments below override the original destinations and
blanket verification instructions, following the owner's later requests.

## Execution order and status

| Plan | Finding covered | Priority | Effort | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [001](001-move-backend-tests.md) | Account and core tests outside test folders | P2 | S | None | DONE |
| [002](002-separate-view-serializers.md) | Eight serializer classes mixed into four view modules | P2 | S | 001 | DONE |
| [003](003-correct-domain-and-permission-placement.md) | ApplicationInput in accounts; IsBusinessAdmin outside permissions.py | P2 | S | 001, 002 | DONE |
| [004](004-extract-password-reset-service.md) | Password-reset workflow and persistence in a view | P2 | S | 001, 002, 003 | DONE |
| [005](005-explain-backend-code.md) | Missing explanations of code purpose and behavior | P3 | M | 001, 002, 003, 004 | DONE |

S means hours; M means approximately a day, including verification. These are
maintenance priorities, not claims of an exploitable vulnerability or broken API.
All reported structural findings have high confidence. Comments are existing
documentation gaps: the comment rule applies prospectively to new or changed
snippets, and no backend change had followed the rule's addition at audit time.

Status values: TODO, IN PROGRESS, DONE, BLOCKED (include reason), REJECTED (include
rationale). Executors update their row and record passed/failed/skipped checks.

## Dependency notes

Execute sequentially. Plan 001 establishes the final test paths and protects test
discovery before later refactors. Plans 002 and 003 overlap account serializers and
operations API imports. Plan 004 touches the same account view imports after those
moves. Plan 005 documents the final arrangement and must preserve executable code.
These are sequencing constraints, not permission to broaden a plan's scope.

Each plan is self-contained and identifies expected changes from predecessors.
Compare drift against `c918fd4` and against the executor's own clean starting point.
Expected predecessor changes are allowed; unexplained differences require review.

## Shared constraints

- Synthetic data only. Demo workflow — pending agency confirmation.
- Preserve API routes, fields, validation, permissions, sessions, CSRF, audit
  actions, and configured demo policies. No new dependencies or migrations.
- Backend formatter and lint tooling were removed by owner request. Do not add
  replacements. They are not configured, rather than failed verification gates.
- Select checks relevant to the change. The owner explicitly requested avoiding
  blanket test runs; AGENTS.md now requires focused verification. The original
  per-plan command tables list available commands, not mandatory repeated suites.
- At planning time, unrelated working changes existed in
  `FEATURE_IMPLEMENTATION_CHECKLIST.md` (deleted), `docs/phases.md`, and
  `frontend/vite.config.js`. Preserve them. Never stage all working files blindly.
- Read README.md, AGENTS.md, docs/phases.md, and the relevant code before execution.
  Do not advance Phase 2 or change owner-gated work as part of this cleanup.
- Use a feature branch and small commits. No push, PR, merge, or deployment is
  included in these plans. An advisor executing the improve skill remains
  read-only; implementation belongs to a separately authorized executor.

## Implementation amendments and verification

- The owner requested dedicated serializer folders during implementation.
  All serializers now live under their owning app's `serializers/` package,
  including request inputs, response contracts, review inputs and the core health
  schema. AGENTS.md now explicitly requires folders rather than allowing either
  standalone modules or packages. See each plan's implementation record.
- Test relocation preserves all 127 existing collected cases with no duplicate
  collection. Test/fixture function bodies are unchanged.
- Ten extracted class bodies and the password-reset workflow were checked for
  AST parity with their originals. Further serializer folder moves preserve the
  existing API schema. No new behavior, dependencies or migrations were added.
- Django system checks passed and OpenAPI generation validated with no schema
  changes. The existing reset single-use test passed (1 passed, 14 deselected).
- No new characterization suite was added: the owner limited this to code
  organization and requested only relevant existing checks.
- The initial broad backend attempt could not initialize pytest's default temp
  directory (Windows access denied) and was interrupted. It is not a passing test
  baseline. The focused reset test used a fresh ignored workspace temp directory
  and passed. No further full backend suite was run.
- Frontend format-check, lint, typecheck and its 7 tests passed once before the
  owner's narrowed verification instruction. Frontend source was not changed and
  those checks were not repeated after each backend-only cleanup step.
- Documentation-only edits preserve executable ASTs for all 84 inventoried
  handwritten modules. Coverage, exclusions and the base commit are recorded in
  plan 005. Applied migrations and generated files were excluded from annotation.
- Changes are saved in small commits on the existing feature branch. Unrelated
  owner changes remain untouched. No push, PR, deployment or phase progression.

The audit inventoried tracked backend Python code. It was not a general security,
performance, dependency, or production-readiness review. No fresh audit findings
are silently included here.

## Findings considered and rejected

- Splitting operations into additional Django apps: not part of this audit.
  docs/architecture.md explicitly assigns branch-scoped domains to operations.
- Treating every older uncommented line as a post-rule violation: incorrect;
  plan 005 is a targeted documentation baseline plus explanations across the
  handwritten backend, not a claim that older changes violated a future rule.
- Renaming every API module to views.py or every contract module to serializers.py:
  not required. Dedicated, responsibility-specific modules are permitted.
- Rewriting applied migrations, changing runtime behavior, or adding lint rules:
  outside the requested cleanup and not necessary to resolve these findings.
