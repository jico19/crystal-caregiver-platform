# Prototype private file lifecycle

Demo workflow — pending agency confirmation. Synthetic fixtures only.

Accepted fixture bytes are verified against the trusted backend manifest for
category, extension, media type, signature, size and SHA-256. Paths are randomized
under ignored `backend/.local/private-files/`. This directory must never be served
by Django, Vite or a web server. Downloads authorize the owning record first.

Replacements append versions; an effective approved version remains effective
until a newer approval, even when that newest approval expires. History and
original bytes are preserved. Seed packets are associated before form publication.
Seeds preserve existing published forms and operator configuration.

Service failures remove their newly written files. A process crash may leave an
unreferenced file; it stays private. From `backend/`, run the read-only inventory:

```powershell
./venv/Scripts/python.exe manage.py audit_private_files
```

The command counts only unreferenced files older than 24 hours and prints no
storage keys. It never deletes anything. Before any manual cleanup, stop writes,
take a fresh inventory, verify each candidate is still absent from StoredFile,
and verify its age again. Never delete a referenced version or packet. Automatic
cleanup and production storage require separate reviewed work.

`frontend/scripts/generate-demo-fixtures.mjs` generates the synthetic asset bundle
using the existing Playwright Chromium dependency. Regeneration changes digests;
review and commit both manifests and both fixture copies together. Existing
accepted historical bytes must be retained. No real identifiers or file pickers.
