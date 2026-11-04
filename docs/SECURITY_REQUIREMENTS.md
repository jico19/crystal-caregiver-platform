# Security implementation baseline — Caregiver Platform

Updated: 2026-11-05. [Scope of work.md](Scope%20of%20work.md), section 6, requests a HIPAA-compliant client portal, secure document storage, role-based access, SSL encryption, audit logs and electronic signatures. The controls below are engineering guidance supporting that scope, not a legal opinion, compliance certification or additional agency business process. Read [AGENT_BUILD_GUIDE.md](AGENT_BUILD_GUIDE.md).

## Safe basic implementation

Basic workflows still need real access control, protected files and truthful records. Do not defer concrete security defects until the agency confirms its processes. Preserve safe existing controls unless a specifically authorized change requires adjustment.

| Scope obligation | Engineering baseline | Evidence to collect |
|---|---|---|
| Role-based access | Authenticate private requests; resolve permissions from server records; enforce record ownership and existing role/state boundaries on reads and writes | Scoped permission checks, including direct API/file requests, unrelated owners and cross-state access |
| Secure document storage | Keep sensitive uploads private; validate upload type/size/metadata; authorize upload, view and download paths; enforce signed-token scope and expiration where used | Owner/staff access works; unauthorized, altered and expired links fail; deployed storage exposure checked |
| SSL encryption | Serve the deployed website/API and sensitive file transfers over HTTPS with valid certificates | Deployed transport, redirects and relevant session/header settings inspected |
| Audit logs | Record relevant actor, action, target and time for review, admission, document and signature operations; protect logs from ordinary user edits; avoid logging secrets or unnecessary sensitive contents | Real actions create attributable records; ordinary users cannot alter evidence |
| Electronic signatures | Bind signer, time and signature to the actual content/version presented; protect signed evidence against silent replacement | Saved evidence matches displayed terms; edits/resubmission cannot falsify prior signed content |
| HIPAA-compliant client portal | Protect client information throughout the implementation and verify relevant deployment and operational controls with responsible owners | Technical checks plus deployment and agency compliance evidence; a local demo is insufficient |

## Existing implementation safeguards

- Reuse the permission classes in `backend/apps/core/permissions.py` and frontend role helpers in `frontend/src/shared/lib/roles.js`.
- State administrators remain restricted to their assigned state and fail closed without a state assignment. Public state switching is navigation, never authority to access private records.
- Caregivers and clients access only records authorized for them. Existing assigned-client access must remain explicitly checked where supported.
- Public application/registration must not overwrite an existing account or let callers choose privileged roles. Never trust caller-supplied ownership, role or state for permission decisions.
- Preserve secure password handling, token validation/rotation where configured, and protected Django media/signed access. Determine exact configuration from code/settings, not old documentation examples.
- Keep secrets out of source and logs. Do not place sensitive documents into public website publishing or downloadable blank-form storage.

These safeguards implement secure access; the Scope of Work does not prescribe Django, a particular token format, an exact administrator hierarchy or particular cryptographic parameters.

## Pending agency and deployment decisions

Confirm official signature forms and signer authority, access responsibilities, notification recipients and content, deployment/storage ownership, retention/deletion policy, backup/recovery arrangements and the owners responsible for compliance evidence. Avoid sending unnecessary sensitive information through reminders.

The scope does not establish a universal seven-year retention rule, automatic deletion, legal-hold administration, a 15-minute signed-link lifetime, a fixed JWT lifetime, a particular cloud/KMS vendor, TLS version, rate-limit number or audit schema. Earlier document values must not be cited as agency approval or legal requirements. Keep safe existing defaults while policy is pending. Do not schedule destructive retention jobs based on an assumed period.

## Verification and reporting

Use scoped tests for meaningful authorization, file, signature and audit changes. Verify deployed controls separately. Report the tested environment and remaining dependencies; never imply all controls exist merely because this document describes them. Do not claim guaranteed legal non-repudiation from a hash or HIPAA compliance from a technology choice.
