# 006: Move intake, signing, and storage workflows into services

Status: Complete. Priority: P2. Audit finding: F7. Completed: 2026-11-09.
Coordinate service ownership with specs 003 and 004; either may create the same
client/document services modules first.

## Problem and outcome

`backend/apps/clients/views.py` owns intake persistence and agreement
hashing/versioning. `backend/apps/documents/views.py` owns storage allocation,
byte validation, status mutation, and audit orchestration. Views must delegate
these domain operations while retaining HTTP parsing and authorization.

## Scope

Deliver three independent slices: client intake, agreement signing, and document
upload/storage. Modify their views, services, validators, serializers where
needed, and focused tests. Reuse services created by earlier cleanup slices.
Database redesign, new legal text, historical signature migration, new upload
protocols, and replacement of the storage backend are outside scope.

## Requirements by workflow

### Client intake

- A client service accepts the authorized client identity and validated data,
  updates/creates the profile, and returns the domain result needed by the view.
- Preserve state assignment from the authenticated identity, signature fields,
  submitted timestamp, pending status, field defaults, and 200/201 distinction.
- Serializer validation and IsClient enforcement remain at the API boundary;
  the service must not accept a client-supplied owner/state override.

### Agreement signing

- A client service owns canonical hash inputs, signed timestamp/name, agreement
  body/title selection, version selection, and persistence.
- Preserve exact canonical JSON separators, concatenation order, hash algorithm,
  title selection, signed content, response fields, and current version behavior.
- Never recompute historical signatures, modify existing signed rows, or change
  legal agreement text during extraction.
- Preserve agreement-list deduplication by key and latest-record behavior.
- If reliable concurrent version allocation requires a schema change, report it
  separately; do not silently claim extraction resolves version races.

### Document allocation and upload

- Views/parsers handle HTTP/raw/multipart input and authorization. Validators own
  file-byte, filename, and size checks. Services own storage key allocation,
  storage calls, document status, and audit orchestration.
- Preserve storage keys, token/URL semantics, expiration durations, supported
  extensions/content signatures, limits, and owner/state checks.
- Validation failure must not store bytes or change document status. Storage
  failure must not produce a successful upload response or success audit event.
- A database transaction does not roll back external storage. Characterize and
  document current failure outcomes; extraction must not add new orphaned-file
  or inconsistent-status paths. Broader cleanup/retry design is separate scope.

## Acceptance criteria

- [x] Selected views perform authorization, validation, delegation, and response
  serialization without implementing the extracted business operations.
- [x] Intake owner/state/status/signature fields and 200/201 behavior are preserved.
- [x] Fixed input and timestamp produce the same agreement hash before and after
  extraction; signing twice retains expected version/listing behavior.
- [x] Historical signed records remain unchanged.
- [x] Upload intent and upload success retain response contracts and storage paths.
- [x] Invalid bytes, oversize files, unauthorized access, and storage failure
  produce the specified failure outcomes without false success.
- [x] No schema or legal-content changes are bundled with these refactors.

## Focused validation

Add characterization/regression cases to `apps/clients/tests.py` and
`apps/documents/tests.py`. Follow the existing agreement signing/deduplication and
upload/unauthorized-upload tests. Run only the file associated with the delivered
slice: `python -m pytest apps/clients/tests.py` or
`python -m pytest apps/documents/tests.py`. Use fixed signing timestamps and local
test storage; add targeted failure injection where storage/transaction boundaries
are affected.

## Completion and validation

- Extended the client/document services established by specs 003 and 004;
  their admission and compliance behavior remains in place.
- Client services now own intake persistence, append-only agreement signing,
  canonical hashing/title/version selection, and latest-created-per-key listing.
  The views retain `IsClient`, object lookup, serializer validation, and responses.
- Document services now own upload allocation, storage writes, pending status,
  upload audits, and the resulting download URL. Upload checks moved unchanged
  into `apps/documents/validators.py`. The views retain authorization and input
  parsing, including raw PUT and multipart POST. The specific multipart/form
  parsers now precede the wildcard raw parser, which previously intercepted
  multipart bodies; no new upload protocol was added.
- Storage keys, URL response fields, storage expiration configuration, and the
  existing one-hour signed-token verification limit are unchanged. No models,
  migrations, legal text, or historical agreement rows were changed.
- Characterization tests passed against the original views before extraction,
  including an independently specified canonical hash at a fixed timestamp.
  Final focused validation, using the backend virtual environment:
  - `python -m pytest apps/clients/tests.py -q`: **10 passed, 5 subtests passed**.
  - `python -m pytest apps/documents/tests.py -q`: **28 passed, 34 subtests passed**.
  Tests use synthetic identities and temporary local storage. Coverage includes
  trusted intake identity/defaults, signing/title/version/list behavior,
  historical immutability, response/storage paths, raw/multipart bytes, accepted
  signatures/extensions, the 15 MiB boundary, token expiry and owner/state access,
  audit metadata, and injected allocation/storage/database/audit/URL failures.

## Preserved storage failure outcomes

The upload order remains storage write, document save, best-effort audit, then
download URL generation. Exceptions still propagate as failed HTTP requests;
no transaction or cleanup/retry policy was added during extraction.

| Failure point | Existing outcome retained |
| --- | --- |
| Intent URL generation | No document allocation or stored bytes; no successful response. |
| Invalid bytes/filename/size or unauthorized upload | No storage write, status mutation, or upload audit; existing rejection response. |
| Storage write | No status save or success audit; no successful response. The existing replace operation deletes the old file before writing, so a write failure can remove previous bytes or leave backend-dependent partial data. |
| Document save after storage | Saved bytes remain, database status remains unchanged, no success audit, and no successful response. |
| Audit helper catches a logging failure | Bytes and pending status remain; the existing best-effort policy still permits HTTP 200 without an audit row. |
| Download URL generation after save/audit | Bytes, pending status, and the upload audit remain, but no successful response is returned. |

A database transaction cannot undo external storage writes. The existing
replacement loss and stored-bytes/database-status mismatch paths above are
characterized by failure-injection tests; extraction does not resolve or add to
them. Broader cleanup, durable auditing, and retry design remain separate work.

## Separate concurrency follow-up

Agreement version allocation still reads the highest version and then inserts a
new row. Concurrent requests can allocate the same version; equal `created_at`
values also retain the existing unspecified listing tie order. This extraction
does not claim to fix either behavior. A separate change should choose explicit
serialization and, if enforcing uniqueness in the database, add and validate the
appropriate constraint/migration after assessing existing data.
