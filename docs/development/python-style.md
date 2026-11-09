# Python style checks

Run from `backend/` with the project virtual environment active:

```powershell
python -m pip install -r requirements-dev.txt
python -m pycodestyle apps/clients/services.py
python -m pycodestyle (Get-Content style-clean-files.txt)
```

The last command checks the full initial clean scope: the 16 non-generated
Python files touched by workflow specs 001-006. On POSIX shells, use
`xargs python -m pycodestyle < style-clean-files.txt`. Check every new or
subsequently changed Python file explicitly as well; add newly cleaned files
to this manifest. An empty checker output and exit code 0 indicate success.

`backend/requirements-dev.txt` pins the style checker separately from runtime
dependencies. `backend/setup.cfg` keeps pycodestyle's default rule selection,
79-character code lines, and explicitly enables the 72-character comment and
docstring limit (`max-doc-length`, reported as W505). It excludes generated
migrations, virtual environments, and caches from recursive discovery.
There is no repository-wide ignore list or blanket `noqa` addition.

Use four spaces, two blank lines around top-level definitions, and grouped
imports: standard library, third-party, then project/local imports. Check
dependencies before moving a local import to module scope. If a cycle or
initialization order requires a local import, explain it at the import site;
apply any necessary checker exception only to that specific line.
pycodestyle is a limited checker, not a complete PEP 8 proof; reviewers must
still assess import grouping, meaningful names, and readability.

The source guidance is [PEP 8](https://peps.python.org/pep-0008/); checker
configuration and its limitations are documented in the
[pycodestyle introduction](https://pycodestyle.pycqa.org/en/latest/intro.html).

## Legacy baseline

The [2026-11-09 baseline](../reviews/007-python-style-baseline.txt) records
800 remaining findings in 76 untouched source files after the initial cleanup.
It contains exact repository-relative path, line, column, code, and message
entries. None of the 16 clean files has baseline findings. Legacy debt is
recorded, not disabled in the checker.

To compare all current findings with that snapshot, run from the repository
root in PowerShell:

```powershell
$currentStyle = (python -m pycodestyle backend) -replace '\\', '/'
Compare-Object (Get-Content docs/reviews/007-python-style-baseline.txt) $currentStyle
```

Use the backend virtual environment's Python executable (activate it first).
The full scan intentionally exits 1 while legacy findings remain.
`Compare-Object` with no output means the findings match the snapshot;
`=>` marks current entries and `<=` marks old entries. Line moves may show
as removal/addition pairs, so inspect the source rather than assuming every
new line number is a new defect. The strict changed-file check is the gate:
legacy violations in a touched file should be cleaned, not added to the
baseline. Keep formatting separate from behavior changes and avoid reformatting
unrelated files. A shrinking baseline is expected as additional files migrate.

Remaining counts by code: E501 571, E302 154, W505 38, E402 16, W293 10,
E251 4, E305 3, W391 2, E303 1, E261 1. These counts help review scope;
they are not per-rule allowances and cannot hide a newly introduced finding.
