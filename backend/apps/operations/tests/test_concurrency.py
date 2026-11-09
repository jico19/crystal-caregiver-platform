import os
import subprocess
import sys
from pathlib import Path


# Check that competing SQLite calls preserve numbering and accept only one terminal action.
def test_real_sqlite_concurrent_versions_reviews_transitions_and_completion(tmp_path):
    environment = {**os.environ, "PYTHONPATH": str(Path.cwd())}
    result = subprocess.run([sys.executable, "apps/operations/tests/concurrency_probe.py", str(tmp_path)], env=environment, capture_output=True, text=True, timeout=60)
    assert result.returncode == 0, result.stderr[-3000:]
    assert "SQLite concurrency checks passed." in result.stdout
