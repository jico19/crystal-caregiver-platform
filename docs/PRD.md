# Product Requirements — Caregiver Platform

Updated: 2026-11-05. Requirements source: [Scope of work.md](Scope%20of%20work.md) only. This document is a delivery summary, not an expansion of the contract. Read [AGENT_BUILD_GUIDE.md](AGENT_BUILD_GUIDE.md) for basic implementation boundaries and client decisions. Later explicit user instructions can clarify scope.

## Purpose

One home-care agency website and portal system serving Florida, Indiana, and Georgia. Families and prospective caregivers learn about services and apply online. Caregivers and clients manage their paperwork and view their information. Agency staff review submissions, monitor requirements and send reminders.

The product is an agency website, digital front desk and paperwork office. A public marketplace for comparing and directly hiring independent caregivers is not requested.

## Delivery stage

Build basic functioning flows where the agency's actual process is still unknown. Save real records, enforce access, show accurate statuses, and support the requested action. Keep agency-specific rules provisional until confirmed. Do not treat this stage as full client acceptance or invent advanced workflow requirements.

Track technical readiness, client process confirmation and deployment evidence separately, using the guide. This document does not certify current implementation status.

## 1. Website integration

- Link the three state websites into one unified platform and allow easy switching between Florida, Indiana and Georgia.
- Preserve state-specific services, forms and licensing information.
- Obtain the existing website/domain details and approved content before claiming external integration or publishing agency claims.
- Public switching does not change a signed-in user's private-record permissions.

## 2. Caregiver portal

### Application and documents

- Online, mobile-friendly caregiver application, downloadable employment packet and electronic signatures.
- Secure upload of Driver's License, CPR Certificate, CNA/HHA Certificate, TB Test, Physical Exam, Background Check, Social Security Card, Auto Insurance, Driver's Insurance, Direct Deposit Form and Other onboarding documents.
- Track expiration dates, remind before expiration by email/SMS, and show expired, expiring-soon and missing documents.

Listed upload categories are not automatically mandatory in every state. Preserve both insurance categories until clarified. Official packet, application questions, mandatory requirements, expiring types, warning timing and review policy need agency input.

### Training and dashboard

- Online access to required in-service courses, course completion tracking, downloadable certificates, progress dashboard, overdue reminders and administrator reporting.
- Dashboard: profile, uploaded documents, onboarding status, completed trainings, pending requirements and company announcements.
- Actual lessons, course requirements, completion evidence, due dates and certificate content need agency input. A basic progress/completion implementation must describe its limits; quizzes, video-only lessons and passing scores are not prescribed.

## 3. Client portal

- Online intake forms, downloadable admission packet, required document uploads and electronic signatures.
- Secure upload of Insurance Cards, Medicaid Documents, Physician Orders, Plan of Care, Identification, Authorizations and Other required documents.
- View active authorizations, receive approval notices and expiration reminders, upload new authorizations and track history.
- Dashboard: care plan, service schedule, forms, uploaded documents, authorization status and agency notifications.
- Secure messaging with the agency is optional.

Begin with intake submission, document/signature records, manually maintained authorization records and client views of actual saved plans/schedules. Obtain official forms, signer rules, approval meanings, required metadata and plan/schedule source from the agency. Staff review in this platform must not imply that the platform issues insurer approval.

## 4. Administrator dashboard

### Caregiver management

Review applications; approve/reject applicants; track onboarding; monitor document compliance and training completion; send reminders; generate reports.

### Client management

Review online referrals; approve admissions; monitor authorization status; track missing documents and service start dates.

### Reports

1. Caregiver compliance.
2. Expiring credentials.
3. In-service completion.
4. Client authorizations.
5. Referral sources.
6. Website inquiries.

Use real records and explicit provisional definitions while report columns, classification and approval stages are confirmed. The scope requests reports, not a particular export format, clinical staffing engine or automatic billing calculation.

## 5. Automation

- Email notifications and SMS reminders.
- Expiring credential alerts, authorization expiration alerts and training reminders.
- New referral notifications and document upload confirmations.
- Electronic signature workflow.

Implement real event/reminder paths with visible delivery status and testable adapters. Actual provider setup, senders, recipients, templates, timing and escalation require agency input. Test or console delivery does not establish live delivery; both email and SMS remain required.

## 6. Security and compliance

The scope requests a HIPAA-compliant client portal, secure document storage, role-based access, SSL encryption, audit logs and electronic signatures. Preserve existing security boundaries during basic implementation. See [SECURITY_REQUIREMENTS.md](SECURITY_REQUIREMENTS.md) for engineering safeguards and evidence limits. Documentation or local functionality alone does not establish operational compliance.

## Scope boundaries

No marketplace, direct family hiring, membership system, payroll, claims/EVV integration, automatic unit burndown, mandatory staffing gates, physician approval workflow, quiz score, report export, purge engine or legal-hold administration is established by the Scope of Work. Existing implementations can remain as supporting functionality; do not expand them or make scope acceptance depend on them without explicit direction.

Exact reminder windows, training validity, token lifetimes, retention periods, uptime/latency objectives and numerical business targets are implementation choices or pending decisions, not requirements supplied by this scope. Technical documents must not create client policy by repetition.

## Acceptance

Map every requested item to a working user action and evidence. A feature can be basic working while agency policy or production evidence remains pending. Full acceptance requires the requested flows, approved agency content/process and relevant deployment evidence. Optional messaging is assessed only if elected. Historical audits are not a current completion checklist.
