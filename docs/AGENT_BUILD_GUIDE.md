# Agent build guide

Updated: 2026-11-05. Read this before planning or implementing work.

## Requirements authority

[Scope of work.md](Scope%20of%20work.md) is the sole product requirements baseline. Keep that original document unchanged. This guide interprets delivery stages; it does not add client requirements. Later explicit user instructions can clarify or change the baseline; record the affected decision rather than treating an internal specification as approval.

We are building one home-care agency website and portals for Florida, Indiana, and Georgia: public services and forms, caregiver onboarding and training, client intake and authorization visibility, administrator review and reporting, notifications, and secure records. We are not instructed to build a Care.com marketplace.

## Reading order and conflicts

1. `../AGENTS.md`: repository commands, implementation conventions, and access-control safeguards.
2. `Scope of work.md`: what the client requested.
3. This guide and `PRD.md`: scope mapping, basic delivery boundaries, and pending client decisions.
4. `SECURITY_REQUIREMENTS.md`: security implementation baseline and verification boundaries.
5. `SAD.md`, `API_CONTRACTS.md`, `DATABASE_SCHEMA_AND_DATA_DICTIONARY.md`, `design.md`, and `PUBLIC_WEBSITE_PUBLISHING.md`: supporting implementation references, never independent sources of product scope.
6. `../plans/` and `reviews/`: dated plans and evidence, not current acceptance or client approval.

For technical behavior, inspect current routes, serializers, models, migrations, settings, and consumers. Older contracts can be inaccurate. Reconcile relevant discrepancies explicitly and update both sides when needed; do not blindly rewrite working code to match an old example. Database changes go through Django migrations, never by executing the schema document's reference DDL.

## What basic functionality means

The user has authorized basic functioning implementations where the agency's actual process is still unknown. Build a usable, persisted flow with appropriate permissions, real data, honest statuses, validation, and success/error feedback. Prefer simple manual administration and existing modules while decisions remain open. Do not build a configurable workflow engine just to accommodate unknowns.

Basic does not mean a decorative screen, fake progress, an unconnected button, a fabricated certificate, or an unsafe upload. It also does not mean the whole contract is complete. Client-dependent content, policies, and external delivery can remain pending, with the dependency recorded. Do not invent official forms, clinical instructions, licensing claims, or agency approvals.

Use separate fields when reporting readiness:

- **Technical status:** Not assessed / Missing / Broken / Basic working / Verified.
- **Client process:** Pending / Confirmed / Not applicable, with the decision or missing input.
- **Deployment evidence:** Pending / Verified / Not applicable.

These are documentation labels, not new application enums. No implementation status is established by this documentation update. Existing audit results remain dated evidence.

## Build boundaries and client decisions

| Area / source section | Basic delivery target | Still requires agency input |
|---|---|---|
| State websites (1) | Unified public entry, FL/IN/GA switching, correct state services/forms/licensing, links to portal flows | Existing domains and linking/redirect approach; real services, licensing, contact details, branding, and approved public content |
| Application and packets (2) | Mobile-friendly application, saved submission, signature record, administrator review, correct state packet link when supplied | Exact questions, official employment packet, signature wording, review steps and approval meaning |
| Caregiver documents (2) | Secure upload/view for all named categories; expiration dates where configured; expired/expiring/missing views | Mandatory documents per state, which expire, acceptance rules, and warning window; upload categories alone do not establish mandatory requirements |
| Training (2) | Course access, saved enrollment/progress/completion, certificate download, administrator completion reporting | Actual course content/supplier, required courses, due dates, completion proof, renewal policy, and certificate wording. A manual completion mechanism is provisional, not proof of learning |
| Caregiver dashboard (2) | Own profile/documents, saved onboarding status, completed training, pending configured requirements, announcements | Agency-specific status meanings and announcement process |
| Intake and forms (3) | Save intake, upload client documents, sign the presented form version, correct admission packet when supplied | Intake fields, official admission packet/forms, consent wording, signer authority, and admission steps |
| Authorizations (3, 4) | Secure upload linked to the client, manual staff review/status, active records, dates and history; approval/expiration notification events | Payer process, required metadata, what counts as approved/active, reviewers, history rules, recipients and reminder timing. Local review does not issue payer approval |
| Care plans and schedules (3) | Client views actual saved plan/schedule records; use simple existing staff entry if needed to supply those views | Who creates/updates them, source system, required fields, clinical review and scheduling process. No inferred staffing optimizer or clinical approval engine |
| Administrator operations (4) | Review applications/referrals, approve/reject applicants, approve admissions, view onboarding/documents/training/authorizations/service start dates, send reminders | Extra approval stages, referral conversion rules, assignment policy and escalation paths |
| Reports (4) | Six working views based on real records: caregiver compliance, expiring credentials, in-service completion, client authorizations, referral sources, website inquiries | Agreed columns, definitions, filters and audience. Define website inquiry classification; do not fabricate attribution. Exports are not explicitly required |
| Notifications and automation (2–5) | Event creation and scheduled reminders, recipient resolution, delivery records and testable email/SMS paths; truthful pending/failed/sent states | Provider credentials, sender identity, recipient preferences, consent process, approved templates, timing/repeats and escalation. A console/test sender is basic development evidence, not live delivery |
| Security (6) | Enforced role/record access, protected files, audit records, signature integrity, HTTPS deployment configuration | Deployment and operational ownership, approved policies and compliance evidence. Basic feature delivery never excuses exposed sensitive data |

Support all caregiver upload categories: Driver's License; CPR Certificate; CNA/HHA Certificate; TB Test; Physical Exam; Background Check; Social Security Card; Auto Insurance; Driver's Insurance; Direct Deposit Form; Other onboarding documents. Preserve both insurance categories pending clarification.

Support all client upload categories: Insurance Cards; Medicaid Documents; Physician Orders; Plan of Care; Identification; Authorizations; Other required documents.

Email and SMS are explicitly required. A provider dependency delays live verification; it does not remove either channel from scope. The electronic signature workflow, new referral notices, document upload confirmations, credential/authorization expiration alerts, and training reminders are also required.

## Optional features and unconfirmed additions

Secure messaging with the agency is explicitly optional. Do not make it a mandatory acceptance criterion.

The Scope of Work does not explicitly require public caregiver search/profiles/reviews, family-directed hiring, marketplace memberships, payroll, billing/claims/EVV integrations, HCPCS unit burndown, automated staffing gates, physician approval engines, quizzes or an 80% pass score, a particular LMS or signature vendor, report exports, or retention/legal-hold administration. Existing related code may remain; its presence does not authorize further expansion.

Exact warning windows (including 30/7 days), annual training validity, retention periods, token lifetimes, provider choices, uptime targets, latency targets and success percentages are not client-approved requirements merely because a technical document states them. Preserve safe existing configuration unless the task calls for a justified change; label defaults as implementation choices and agency policy as pending.

Public state switching must not grant access to another state's private records. Keep current role/state boundaries, including locked state administrators and super-admin helpers, as implementation safeguards. The scope does not specify that exact role model, and state websites are not necessarily separate agency tenants.

## Working rules

- Trace changes to a Scope of Work section. For unspecified process, state the basic behavior and pending decision in the handoff.
- Continue independent work while client input is pending. Fix broken contracts, access defects and false data without turning developer defects into client questions.
- Do not remove existing features, reset data, run password-resetting seed scripts, or weaken controls just to narrow documentation to scope.
- Do not treat an old plan as authorization to implement everything it lists. Check its scope and current code first.
- Use existing patterns; keep changes focused. Test meaningful behavior and security risks with the smallest relevant scope; documentation-only changes need diff/link review.
- Report what changed, what was verified, what works at a basic level, and which client/deployment dependencies remain. Never claim full scope completion from a successful build or seeded demonstration.

For feature work, record `Scope section | Basic behavior | Technical status + evidence | Client decision/input | Deployment evidence | Next action` in the relevant task handoff. Populate it from inspection and checks, not assumptions.
