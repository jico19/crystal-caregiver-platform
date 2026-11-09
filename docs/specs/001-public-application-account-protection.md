# 001: Protect existing accounts during public caregiver applications

Status: Complete. Priority: P0. Audit finding: F1. Depends on: none.

## Problem and outcome

`ApplyPublicView` permits anonymous requests. Its serializer delegates to
`submit_caregiver_application`, which looks up a user by email and then sets the
password, caregiver role, state, and active status even when that user existed.
Public application submission must create a new identity or fail without
modifying an existing identity.

Evidence: `backend/apps/caregivers/views.py:15`,
`backend/apps/caregivers/serializers.py:47`,
`backend/apps/caregivers/services.py:21`, and
`backend/apps/authentication/models.py:14`.

## Scope

Modify the caregiver application service, input serializer, and focused tests.
Adjust the public view only as needed to translate domain errors into DRF
responses. Preserve the endpoint and fresh-application response contract.
Password recovery, account linking, authenticated resubmission, identity schema
redesign, and historical account repair are separate work.

## Requirements

- Normalize submitted email consistently with the existing user manager. Reject
  case-insensitive matches to existing identities, including inactive, suspended,
  or soft-deleted users; public submission cannot reactivate or repurpose them.
- Respond to an existing email with HTTP 400 and a stable DRF field error on
  `email`. Proposed message: `Unable to create an application with this email.`
  The response must not expose the existing role, state, or account status.
- On rejection, preserve password hash, identity fields, role, state, status,
  profile fields, and existing applications. Create no new linked profile or
  application and do not reset credentials.
- A fresh identity receives the submitted password through the existing password
  hashing API, a caregiver profile, and a submitted application with its signature
  and content hash. Preserve the current HTTP 201 response keys.
- Identity, profile, and application creation form one atomic operation. A later
  failure must roll back earlier writes.
- Duplicate normalized submissions must not produce duplicate users or overwrite
  the winner. Use existing database uniqueness as the final creation safeguard;
  translate a known duplicate-creation conflict into the same validation error.
  Do not catch unrelated database errors as if they were duplicate emails.
- Input validation belongs in serializers; creation and identity protection belong
  in the service so another caller cannot bypass the protection.

## Acceptance criteria

- [x] Fresh-email submission returns 201 and creates exactly one user, profile,
  and submitted application with a hashed password and expected signature fields.
- [x] Existing caregiver, client, and administrator identities each receive the
  specified rejection with all identity/profile/application data unchanged.
- [x] Mixed-case email submissions cannot bypass existing-identity protection.
- [x] Inactive, suspended, and soft-deleted identities cannot be reactivated.
- [x] Repeating a successful submission rejects the repeat without modifying the
  first user's password or creating another application.
- [x] An application-creation failure leaves no partially created identity/profile.
- [x] Duplicate-creation conflict handling preserves the existing/winning identity.

## Focused validation and limitations

Extend `backend/apps/caregivers/tests.py`, following
`test_caregiver_apply_public_atomic`. Run
`python -m pytest apps/caregivers/tests.py`.
Exercise conflict handling using an isolated database-backed test or controlled
conflict injection; do not claim SQLite proves production concurrency behavior.

If historical email casing or existing duplicate identities prevent consistent
matching, document the affected shape and propose separate data remediation.
Do not silently merge identities or broaden this fix into a migration project.

Completed 2026-11-09. Focused validation: all 15 caregiver tests passed using
`venv/Scripts/python.exe -m pytest apps/caregivers/tests.py` from `backend/`.
SQLite exercised actual duplicate-insert conflicts and rollback; PostgreSQL
constraint diagnostics were tested with mocks. Production concurrency was not
verified. Historical mixed-case identities and case variants were rejected
without modifying or merging either identity.
