# Product Requirements Document (PRD) — Caregiver Platform

## 1. Executive Summary & Vision

### 1.1 Product Overview
The **Caregiver Platform** is an enterprise multi-state healthcare and home health agency management platform operating across **Florida (FL)**, **Indiana (IN)**, and **Georgia (GA)**. It provides end-to-end digital operations for home care agencies, caregivers, and clients, replacing disparate manual paper processes with a unified, HIPAA-compliant digital operating system.

### 1.2 Core Vision & Value Proposition
- **Multi-Tenant State Architecture**: A single unified web application serves all three states. State is data and an explicit authorization boundary—not fragmented codebases or separate deployments.
- **Provider & Caregiver Enablement**: Streamlined digital onboarding with atomic registration, electronic signatures, license/credential tracking, and integrated in-service training certification.
- **Client & Family Empowerment**: Self-service client intake, digital consent agreement execution, care plan and visit schedule transparency, and insurance prior authorization tracking.
- **Agency Operational Excellence**: Real-time administrative triage, automated pre-assignment compliance verification, Medicaid prior authorization unit burndown, and regulatory audit readiness.
- **Django REST Framework Monolith**: Built upon **Django REST Framework (DRF 3.18+)** on **Django 6.1+ (Python 3.14/3.12+)**, leveraging declarative serializers, viewsets, Django ORM, and deterministic schema migrations, providing robust enterprise stability and rapid development velocity.
- **Django Built-in Auth & SimpleJWT**: Self-hosted identity powered by Django's native authentication framework (`django.contrib.auth`) paired with `djangorestframework-simplejwt` for RFC 7519 JSON Web Token issuance and rotation, completely eliminating external BaaS dependencies. Role and state authorization boundaries are enforced via DRF permission classes and scoped querysets.
- **Built-in Django Media Storage & S3 Portability**: Utilizes Django's native media storage engine (`MEDIA_ROOT` / `FileSystemStorage`) paired with cryptographic HMAC signed tokens for secure direct uploads and streaming downloads, eliminating external cloud storage dependencies while remaining compatible with AWS S3 via optional configuration (`USE_S3=true`).

---

## 2. Target Personas & User Classes

| Persona | Role Key | Description & Responsibilities |
|---|---|---|
| **Super Administrator** | `super_admin` | Executive leadership and technical operations. Has unrestricted global visibility across all operating jurisdictions (FL, IN, GA). Manages agency staff, reassigns state administrators, configures global compliance settings, and conducts cross-state operational audits. |
| **State Administrator** | `administrator` | Regional clinical director or intake coordinator assigned to a single state (`state_id`). Manages local client referrals, approves admissions, reviews caregiver applications, tracks authorization units, and enforces credential compliance. |
| **Caregiver / Aide** | `caregiver` | Certified Nursing Assistants (CNAs), Home Health Aides (HHAs), and personal care attendants. Completes onboarding applications, uploads credentials, monitors compliance deadlines, reviews assigned client care plans and schedules, and completes annual in-service training. |
| **Client / Patient** | `client` | Home care recipient or authorized legal representative/family member. Submits intake medical packets, signs legally binding care agreements, reviews care directives and weekly visit schedules, and submits insurance approval documents. |
| **Public Visitor** | `public` | Prospective clients, family members, or job seekers visiting regional landing pages. Browses state-specific services, downloadable forms, regulatory licensing disclosures, career openings, or submits referral inquiries. |

---

## 3. Product Principles & Guardrails

1. **State as an Authorization Boundary**: Regional rules, licensing, and compliance are data-driven. Administrators can only view and mutate records belonging to their assigned state.
2. **Zero-Trust Input Validation**: Never trust client-supplied user IDs, roles, or state scopes. Authorization boundaries are resolved solely from verified cryptographic session tokens and server-side records.
3. **Clinical Immutability & Auditability**: Critical actions (agreements, intake signatures, caregiver approvals, data modifications) produce immutable, append-only audit records with cryptographic SHA-256 hashes.
4. **Fail-Closed Security**: Any administrative request lacking a verified state assignment or attempting cross-state manipulation fails immediately with HTTP 403 Forbidden.
5. **Vendor-Neutral Cloud Portability**: Zero dependency on proprietary database triggers, Edge Functions, or proprietary authentication services. Compatible with standard PostgreSQL 16+ and S3-compatible storage.

---

## 4. Functional Requirements by Domain

### 4.1 Public State CMS & Marketing Portals (`/states/*`)
- **FR-CMS-01: Multi-State Landing Pages**: The platform must deliver tailored landing pages for `/florida`, `/indiana`, and `/georgia` displaying localized agency details, regional contact information, and state accreditation badges.
- **FR-CMS-02: State Services Catalog**: Dynamic display of covered home care services (e.g., Personal Care, Companion Care, Respite Care, Skilled Nursing) filtered by state jurisdiction.
- **FR-CMS-03: Downloadable Forms & Resources**: Public repository of state-specific forms (admission packets, HIPAA policies, emergency contacts) accessible without authentication.
- **FR-CMS-04: Licensing & Regulatory Disclosures**: State-specific licensing declarations, Medicaid provider IDs, and statutory regulatory notices.
- **FR-CMS-05: State Career Board**: Real-time listing of active job openings per state with direct linkage to the online caregiver application.
- **FR-CMS-06: Public Referral & Inquiry Submission**: Prospective clients or referral sources (hospitals, case managers) can submit contact inquiries, automatically creating a triageable referral record (`client_referrals`) in status `new`.

### 4.2 Caregiver Onboarding & Portal (`/caregiver/*`)
- **FR-CG-01: Public Applicant Registration & Atomic Intake**:
  - Prospective caregivers complete a multi-step digital application capturing personal demographics, contact info, date of birth, SSN (last 4), and work history.
  - Interactive digital canvas capturing electronic signatures.
  - The submission executes atomically: provisions user credentials, sets up profile, and submits the application record in status `submitted`.
  - Backend computes a SHA-256 integrity hash (`content_hash`) over the application contents.
- **FR-CG-02: Document Upload & Management**:
  - Secure upload of required credentials: Driver's License, CPR Certificate, CNA/HHA License, TB Test results, Physical Exam, Level 2 Background Check, Auto Insurance, and Direct Deposit authorizations.
  - Captures mandatory document expiration dates where applicable.
- **FR-CG-03: Credential Compliance Checklist**:
  - Dashboard displaying compliance status against state-mandated requirements (Missing, Expiring Soon within 30 days, Expired, Approved, Pending Review).
- **FR-CG-04: Application Lifecycle & Resubmission**:
  - Caregiver can track application state: `submitted` -> `under_review` -> `approved` or `rejected`.
  - If rejected, the caregiver sees the specific administrative `rejection_reason` and can amend data, re-sign, and resubmit (moving status to `under_review`).
- **FR-CG-05: Client Roster & Clinical Care Plans**:
  - Active caregivers can view only clients specifically assigned to them through active `caregiver_client_assignments`.
  - Read-only access to assigned client care plans, daily living tasks (ADLs), emergency protocols, and scheduled weekly visit blocks.
- **FR-CG-06: In-Service Training & Certification**:
  - Caregivers access state-mandated continuing education courses (HIPAA, Infection Control, Alzheimer's/Dementia, Fall Prevention).
  - Track course progress and enrollments (`not_started`, `in_progress`, `completed`).
  - Upon completion, dynamically generate and download a formal, serialized PDF Certificate of Completion.
- **FR-CG-07: In-App Notifications & Announcements**:
  - Real-time and persistent alerts regarding expiring credentials, training deadlines, schedule adjustments, and regional company announcements.

### 4.3 Client Intake & Portal (`/client/*`)
- **FR-CL-01: Digital Intake Questionnaire**:
  - Admitted or prospective clients complete clinical intake questionnaires detailing medical conditions, emergency contacts, physician details, and primary insurance/Medicaid numbers.
  - Captures electronic signature consenting to home care evaluation.
- **FR-CL-02: Electronic Legal Agreements**:
  - Presentation and execution of mandatory statutory documents:
    1. *Home Care Service Agreement*
    2. *HIPAA Privacy Practices & Disclosure Notice*
    3. *Client Rights and Responsibilities*
  - Digital signature capture, signer full name, timestamp, and immutable SHA-256 integrity hashing stored in `client_agreements`.
  - Agreement history versioning allowing re-signing upon annual policy revisions.
- **FR-CL-03: Document Upload**:
  - Secure upload of client-side documents: Insurance Cards, Medicaid Verification, Physician Orders (485 Form), and Existing Plans of Care.
- **FR-CL-04: Prior Authorization Self-Service Upload**:
  - Clients can upload payer prior authorization approval letters.
  - Ingests into the authorization review pipeline with `source = 'client'` and status `pending`.
- **FR-CL-05: Care Plan & Schedule Visibility**:
  - Real-time transparency into approved care plan activities, primary nurse details, and assigned caregiver visit shifts.

### 4.4 Administrator Portal (`/admin/*`)
- **FR-AD-01: Real-Time State Dashboard**:
  - High-level KPIs scoped to the administrator's state: Active Caregivers, Active Clients, Pending Applications, Expiring Authorizations (<30d), and Document Review Queue.
- **FR-AD-02: Caregiver Recruitment Funnel**:
  - Review queue for submitted caregiver applications.
  - Detailed applicant inspection: e-signature verification, document preview, and background check verification.
  - Approve applicant (transitions status to `approved`) or Reject with mandatory rejection rationale.
- **FR-AD-03: Client Admission Lifecycle**:
  - Formal client admission workflow managing status transitions: `pending` -> `approved` -> `active`, or `discharged` / `rejected`.
  - Sets `service_start_date`, records admitting administrator (`admitted_by`), and captures admission notes.
- **FR-AD-04: Pre-Assignment Compliance Gate**:
  - Automated verification engine preventing caregiver-to-client staffing unless:
    1. Caregiver status is `active`.
    2. All mandatory state-specific documents are approved and unexpired.
    3. Mandatory in-service training courses are completed and within validity.
  - Blocked assignments return explicit missing credential diagnostics.
- **FR-AD-05: Prior Authorization & HCPCS Burndown Management**:
  - Management of payer authorizations specifying: HCPCS Billing Code (e.g., `T1019`), unit type (`15_min`, `hourly`, `visit`), total authorized units, weekly hour caps, and validity dates.
  - Tracks unit consumption (`units_used`) and calculates real-time remaining unit balances.
- **FR-AD-06: Referral Pipeline Management**:
  - Triage incoming leads from public forms or hospital partners: `new` -> `contacted` -> `converted` -> `closed`.
  - One-click referral conversion automatically provisions a new `clients` record linked via `converted_client_id`.
- **FR-AD-07: Clinical Care Plans & Shift Scheduling**:
  - Build structured care plans specifying primary nurse, emergency protocols, and granular Activities of Daily Living (ADLs).
  - Build weekly recurring shift schedules with start/end times and caregiver assignments. Validates against weekly authorization hour limits.
- **FR-AD-08: Document Compliance Review & Requirements Matrix**:
  - Central review queue for all uploaded documents with approve/reject workflow.
  - Manage state-specific document requirements matrix (`document_requirements`) for caregivers and clients.
- **FR-AD-09: User Account & Jurisdiction Administration**:
  - View all user accounts, filter by role/state, update account status (`active`, `suspended`).
  - Super Admin authority to reassign administrator state scopes and change user role tiers.

### 4.5 Automated Daemons & Compliance Tasks
- **FR-AUT-01: Credential Expiration Scanner**: Periodic 24-hour background task scanning caregiver documents; issues alert notifications 30 days and 7 days prior to expiration.
- **FR-AUT-02: Training Due Date Scanner**: Periodic task identifying caregivers approaching annual in-service deadlines; triggers automated reminders.
- **FR-AUT-03: Authorization Expiration Scanner**: Scans active prior authorizations expiring within 30 days or exceeding 90% unit burndown; notifies agency billing coordinators.
- **FR-AUT-04: HIPAA 7-Year Data Retention & Legal Hold Engine**:
  - Soft-deleted entities retain timestamps and deleting user IDs.
  - Daily retention purge job deletes records soft-deleted over 7 years ago, provided `legal_hold = FALSE`.
  - Administrative endpoints to toggle `legal_hold` protection and restore accidentally soft-deleted entities.

---

## 5. Non-Functional Requirements (NFR)

### 5.1 Performance & Latency
- **NFR-PERF-01**: P95 API response time for transactional read endpoints must be `< 150 ms` under standard load.
- **NFR-PERF-02**: Paginated listing endpoints must execute in `< 100 ms` utilizing partial composite database indexes (`(state_id, <sort_col>) WHERE deleted_at IS NULL`).
- **NFR-PERF-03**: Database queries must use connection pooling and persistent connections (`CONN_MAX_AGE` or RDS Proxy / PgBouncer pooler).

### 5.2 Security & HIPAA Compliance
- **NFR-SEC-01**: Passwords hashed using Argon2id with recommended parameters (memory cost >= 64MB, time cost >= 3, parallelism >= 4).
- **NFR-SEC-02**: Stateless Bearer JWT tokens signed using HMAC-SHA256 / RS256 with an expiration horizon of 60 minutes.
- **NFR-SEC-03**: Full audit trail recording user identity, action, table name, record ID, whitelisted old/new JSON diffs, IP address, user agent, request ID, and entity state ID.
- **NFR-SEC-04**: Documents stored in protected storage (`MEDIA_ROOT` locally or private S3 buckets in production). Access and upload operations are strictly gated via cryptographic time-stamped HMAC tokens or authenticated RBAC checks with bounded TTL (<= 1 hour).
- **NFR-SEC-05**: TLS 1.3 encryption enforced on all network boundaries.

### 5.3 Reliability & Availability
- **NFR-REL-01**: 99.9% uptime target during operational hours (8:00 AM - 8:00 PM EST).
- **NFR-REL-02**: Automated database backups with Point-in-Time Recovery (PITR) with a Recovery Point Objective (RPO) < 15 minutes and Recovery Time Objective (RTO) < 2 hours.

---

## 6. Success Metrics & Key Performance Indicators (KPIs)

1. **Caregiver Time-to-Onboard**: Reduction in caregiver onboarding duration from submission to active status by >= 60% (target < 72 hours).
2. **Credential Compliance Rate**: Maintain >= 98% compliance across all active caregivers with zero expired certifications on active shifts.
3. **Authorization Claim Denials**: Reduction in Medicaid claim denials due to expired authorizations or unit overages to < 1%.
4. **Intake Completion Rate**: Digital client intake completion rate >= 90% without agency staff phone intervention.
5. **Audit Readiness**: 100% compliance report generation time < 5 seconds for state regulatory inspections.
