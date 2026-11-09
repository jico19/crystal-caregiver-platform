# Open decisions (question | assumption | owner | status)
- Are FL/IN/GA one legal entity, separate entities, or brands? Who crosses state lines?
- Official caregiver application, vetting, onboarding and approval steps per state?
- Required credentials per role/branch, validity periods, verifiers?
- Who creates client records, consents for clients, sees care info?
- Actual intake, admission, referral, authorization, discharge flows?
- Training provider, certificate rules, annual requirements?
- Approved e-sign, email, SMS, storage, scheduling vendors?
- Retention, logging, incident response, export, deletion policies?
- BAAs and approved systems for real PHI?
- Production domains, budget, operations owner, support?

## Phase 0 decisions recorded 2026-11-09

- Branch access: owner confirmed retaining the current demo boundaries. FL/IN/GA
  remain separate branch access boundaries; state administrators see only their
  assigned branch, and agency administrators see branches of their assigned agency.
  This confirms the prototype access behavior, not legal entity structure.
- Ordinary staff: owner confirmed management access remains disabled until an
  agency staff permission policy is approved. Existing staff assignments grant no
  directory management access; do not enable it from public state selection.
- Frontend tools: owner confirmed Oxfmt and Oxlint. Retain existing dependencies
  and configurations; reconcile documentation to these tools.
- PostgreSQL validation: owner confirmed no disposable PostgreSQL database is
  available. Keep migration/integrity validation on PostgreSQL pending. SQLite
  evidence cannot close that gate.

## Phase 1 demo defaults recorded 2026-11-09

Approved demo defaults; agency policy still pending. Source: owner selections and
approved [specification plan](specs/phase-1-requirements.md). These decisions authorize
specifications only; application implementation remains gated on Phase 0.

| Decision | Demo default | Owner/status |
| --- | --- | --- |
| Application fields | Synthetic name/email, experience category, availability selections and demo acknowledgement; existing account/password flow retained | Owner-approved spec default; agency fields pending |
| Files | Generated fixtures only, actual multipart upload/private download, no arbitrary local file picker; backend accepts only approved fixture contents | Owner-selected demo policy; real documents prohibited |
| Required credentials | Synthetic license, CPR and CNA/HHA in each state; expiration tracked; remaining catalog optional | Owner-selected demo policy; legal/state requirements unconfirmed |
| Insurance overlap | Auto insurance and driver's insurance remain separate optional categories | Agency clarification pending |
| Onboarding | Explicit administrator completion after application approval and required document approval/validity; no automatic work eligibility | Owner-selected demo policy; agency onboarding pending |
| Review authority | Current branch/agency administrators only; ordinary staff management stays disabled | Existing owner-confirmed boundary retained |
| Execution gate | Specs now; code after Phase 0 and PostgreSQL validation | Owner-selected sequencing; no PostgreSQL environment available |

Exact fields, transitions, expiry calculations and acceptance criteria are versioned
in the linked specs. All content remains illustrative until agency review; no
production storage/vendor or legal policy is approved here.

## Implementation instructions recorded 2026-11-09

- Owner explicitly requested implementing the Phase 1 specs. Use SQLite for the
  development/prototype implementation. PostgreSQL validation is deferred until
  migration work; it no longer blocks prototype implementation. Do not claim
  PostgreSQL results from SQLite tests or production readiness.
- Owner confirmed pip/npm installation commands. A PostgreSQL driver was approved
  but is not installed while SQLite is the chosen database; add it when needed.
