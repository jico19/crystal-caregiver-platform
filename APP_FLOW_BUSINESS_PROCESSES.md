# Business Processes & Application Flow Map — Caregiver Platform

## 1. System Overview & Core Actors

The Caregiver Platform manages multi-state home health operations across **Florida (`FL`)**, **Indiana (`IN`)**, and **Georgia (`GA`)**. All processes operate under strict state jurisdictional scoping and Role-Based Access Control (RBAC).

```mermaid
flowchart TD
    subgraph Actors ["Platform Personas"]
        PUB["Public Visitor / Referral Source"]
        CG["Caregiver / Aide (caregiver)"]
        CL["Client / Patient / Family (client)"]
        ADM["State Administrator (administrator)"]
        SADM["Super Administrator (super_admin)"]
    end

    subgraph Portals ["Web Applications & Portals"]
        P_PUB["Public State Sites (/:state)"]
        P_CG["Caregiver Portal (/caregiver)"]
        P_CL["Client Portal (/client)"]
        P_ADM["Admin Portal (/admin)"]
    end

    PUB --> P_PUB
    CG --> P_CG
    CL --> P_CL
    ADM --> P_ADM
    SADM --> P_ADM
```

### Actor Capabilities Matrix
| Persona | Role Key | Jurisdictional Scope | Primary Responsibilities |
|---|---|---|---|
| **Public Visitor** | *None* | Selected state (`/:state`) | View services, licenses, career openings; download forms; submit referrals. |
| **Caregiver / Aide** | `caregiver` | Assigned state (`state_id`) | Submit application, upload credentials, track compliance, complete in-service training, review assigned client care plans & schedules. |
| **Client / Representative** | `client` | Assigned state (`state_id`) | Submit clinical intake, sign mandatory legal agreements, upload prior authorizations, view care plans & caregiver schedules. |
| **State Administrator** | `administrator` | Locked state (`state_id`) | Review caregiver applications, triage referrals, admit clients, review credentials, manage authorizations, enforce compliance gates, schedule shifts. |
| **Super Administrator** | `super_admin` | Global (`ALL` states) | Cross-state operational oversight, staff user management, role assignments, state scope configuration, compliance settings. |

---

## 2. Process 1: Public Marketing & Referral Acquisition

Handles regional prospective client discovery, job board recruitment, and lead acquisition.

```mermaid
sequenceDiagram
    autonumber
    actor Visitor as Public Visitor / Hospital Case Manager
    participant Web as React Frontend (/:state)
    participant API as Marketing API (/api/v1/states)
    participant DB as PostgreSQL Database
    actor Admin as State Administrator

    Visitor->>Web: Navigate to /:state (florida / indiana / georgia)
    Web->>API: GET /api/v1/states/:state/ (services, forms, careers, licensing)
    API->>DB: Query website_content, services, job_postings, licensing_info
    DB-->>API: Return state-specific public records
    API-->>Web: Render localized landing page
    
    Visitor->>Web: Fill and submit Contact / Referral Form
    Web->>API: POST /api/v1/states/:state/contact/
    API->>DB: INSERT into client_referrals (status='new', state_id)
    DB-->>API: Referral record created
    API-->>Web: 201 Created {referral_id, status: 'new'}
    Web-->>Visitor: Display submission confirmation
    
    Admin->>API: GET /api/v1/admin/referrals (scoped state)
    API->>DB: SELECT * FROM client_referrals WHERE status='new'
    DB-->>Admin: New referral appears in triage queue
```

### Process Steps & Endpoints
1. **State Discovery (`GET /:state`)**: Loads public catalog (services, statutory licenses, career openings).
2. **Referral Submission (`POST /api/v1/states/<state>/contact/`)**: Unauthenticated submission capturing contact info, referral source, and clinical care needs.
3. **Database Insertion**: Persists in `client_referrals` with `status = 'new'`.

---

## 3. Process 2: Caregiver Recruitment, Atomic Onboarding & Credentialing

Manages the applicant lifecycle from public intake to credential review, background checks, and active employment readiness.

```mermaid
stateDiagram-v2
    [*] --> Submitted: Public Atomic Registration
    Submitted --> UnderReview: Admin Opens Application
    UnderReview --> Approved: Admin Approves Applicant
    UnderReview --> Rejected: Admin Rejects (rejection_reason)
    Rejected --> UnderReview: Caregiver Corrects & Resubmits
    Approved --> [*]: Ready for Shifts (subject to Pre-Assignment Gate)
```

```mermaid
sequenceDiagram
    autonumber
    actor CG as Applicant / Caregiver
    participant Web as Caregiver Portal (/caregiver/application)
    participant AuthAPI as Auth & Caregiver API
    participant Media as Django Media Storage (MEDIA_ROOT)
    participant DB as PostgreSQL Database
    actor Admin as State Administrator

    CG->>Web: Complete demographics, SSN, background disclosure & digital signature
    Web->>AuthAPI: POST /api/v1/caregivers/apply-public
    Note over AuthAPI: Executes atomically via transaction.atomic()
    AuthAPI->>DB: 1. Create User (role='caregiver', status='active')
    AuthAPI->>DB: 2. Create Caregiver Profile (demographics)
    AuthAPI->>DB: 3. Create CaregiverApplication (status='submitted', SHA-256 content_hash)
    AuthAPI-->>Web: 201 Created {tokens, caregiver_id, application_id}
    Web-->>CG: Authenticate session and redirect to /caregiver/dashboard

    CG->>Web: Upload required credentials (CNA, CPR, Driver's License)
    Web->>AuthAPI: POST /api/v1/documents/upload-intent
    AuthAPI-->>Web: Upload URL with signed token + Document record (pending_review)
    Web->>AuthAPI: PUT /api/v1/documents/:id/upload-file/?token=:sig (binary stream)
    AuthAPI->>Media: default_storage.save(storage_key, file)
    AuthAPI-->>Web: 200 OK (Uploaded & saved to media storage)

    Admin->>AuthAPI: GET /api/v1/admin/caregivers (Filter: status=submitted)
    AuthAPI-->>Admin: List pending applicants
    Admin->>AuthAPI: POST /api/v1/admin/caregivers/:id/review {action: 'approved' | 'rejected', notes}
    AuthAPI->>DB: UPDATE caregiver_applications SET status='approved', reviewed_by=admin_id
    DB-->>AuthAPI: Updated record
    AuthAPI-->>Admin: 200 OK Application status updated
```

### Process Steps & Endpoints
1. **Public Intake (`POST /api/v1/caregivers/apply-public`)**: Single atomic transaction provisioning `users`, `caregivers`, and `caregiver_applications` with digital signature canvas data and SHA-256 non-repudiation `content_hash`.
2. **Credential Upload (`POST /api/v1/documents/upload-intent` & `PUT /upload-file/`)**: Requests signed upload URL; binary file streams directly to Django media storage (`backend/media/`, `documents.status = 'pending_review'`).
3. **Admin Review (`POST /api/v1/admin/caregivers/<application_id>/review`)**: Administrator approves (`approved`) or rejects (`rejected`) with required `rejection_reason`.
4. **Applicant Resubmission (`POST /api/v1/caregivers/applications/resubmit`)**: Allows rejected applicants to amend details, re-sign, and return application to `under_review`.

---

## 4. Process 3: In-Service Training & Certification

Enables caregivers to complete state-mandated continuing education and obtain regulatory proof of completion.

```mermaid
flowchart TD
    A["Caregiver browses Course Catalog<br/>GET /api/v1/training/courses"] --> B["Caregiver Enrolls in Course<br/>POST /api/v1/training/courses/:id/enroll"]
    B --> C["Enrollment Record Created<br/>(status: 'not_started' -> 'in_progress')"]
    C --> D["Caregiver Completes Modules<br/>POST /api/v1/training/courses/:id/complete"]
    D --> E["Enrollment Status Updated<br/>(status: 'completed', completed_at: NOW)"]
    E --> F["Dynamically Generate PDF Certificate<br/>GET /api/v1/training/courses/:id/certificate"]
    F --> G["ReportLab Engine generates signed PDF<br/>Caregiver downloads serialized Certificate"]
```

### Process Steps & Endpoints
1. **Browse Courses (`GET /api/v1/training/courses`)**: Lists mandatory curriculum (Infection Control, HIPAA, Dementia Care).
2. **Enrollment (`POST /api/v1/training/courses/<id>/enroll`)**: Initializes progress tracking (`training_enrollments`).
3. **Completion (`POST /api/v1/training/courses/<id>/complete`)**: Sets `completed_at` timestamp and status to `completed`.
4. **Certificate Retrieval (`GET /api/v1/training/courses/<id>/certificate`)**: Generates an audit-ready, serialized PDF certificate via ReportLab.

---

## 5. Process 4: Client Referral Triage, Intake & Legal Admission

Coordinates patient referrals, clinical intake packets, statutory legal agreements, and official service admission.

```mermaid
stateDiagram-v2
    [*] --> NewReferral: Public / Case Manager Submission
    NewReferral --> Contacted: Admin Triage & Contact
    Contacted --> Converted: Admin Converts to Client Account
    Converted --> IntakePending: Client Completes Medical Questionnaire
    IntakePending --> AgreementsPending: Client Signs Mandatory Legal Agreements
    AgreementsPending --> PendingAdmission: Admin Verifies Packet & Insurance
    PendingAdmission --> Active: Admin Admits Client (service_start_date set)
    PendingAdmission --> Rejected: Admin Rejects Admission
    Active --> Discharged: Service Concluded / Care Transferred
```

```mermaid
sequenceDiagram
    autonumber
    actor Admin as State Administrator
    actor Client as Client / Representative
    participant Web as React Frontend
    participant API as Backend DRF API
    participant DB as PostgreSQL Database

    Admin->>API: GET /api/v1/admin/referrals
    API-->>Admin: List new referrals
    Admin->>API: PATCH /api/v1/admin/referrals/:id {status: 'converted'}
    API->>DB: 1. Provision User (role='client')<br/>2. Create Client record (status='pending')<br/>3. Link converted_client_id
    API-->>Admin: Client account provisioned

    Client->>API: POST /api/v1/clients/intake
    API->>DB: Save medical history, emergency contacts, physician orders
    API-->>Client: 200 OK Intake recorded

    Client->>API: POST /api/v1/clients/me/agreements/:key/sign
    Note over API: Signs Service Agreement, HIPAA, Rights & Responsibilities
    API->>DB: INSERT into client_agreements (SHA-256 content_hash, signature_data)
    API-->>Client: 201 Created Legal Agreement signed

    Admin->>API: POST /api/v1/admin/clients/:id/admission {status: 'active', service_start_date: 'YYYY-MM-DD'}
    API->>DB: UPDATE clients SET status='active', admitted_by=admin_id, admitted_at=NOW()
    API-->>Admin: 200 OK Client actively admitted
```

### Mandatory Statutory Agreements
1. **Home Care Service Agreement (`service_agreement`)**: Terms of non-medical personal care and hourly commitments.
2. **HIPAA Privacy Practices Notice (`hipaa_privacy`)**: Statutory medical data disclosure rights.
3. **Client Rights & Responsibilities (`client_rights`)**: Code of conduct, complaint escalation, and patient protections.

---

## 6. Process 5: Prior Authorization & HCPCS Burndown Management

Prevents Medicaid/commercial claim rejections by tracking approved units and active hour consumption.

```mermaid
flowchart TD
    A["Payer Authorization Ingested<br/>(Client Upload or Admin Entry)"] --> B["Admin Review & Activation<br/>POST /api/v1/admin/authorizations/:id/review"]
    B --> C["Authorization Active<br/>(HCPCS Code e.g. T1019, Total Units, Weekly Max Hours)"]
    C --> D["Caregiver Shifts Scheduled & Completed"]
    D --> E["Units Deducted from Authorization<br/>(units_used increments)"]
    E --> F{"Remaining Balance Check"}
    F -->|Balance > 10% & Time > 30d| G["Nominal Burndown"]
    F -->|Balance <= 10% OR Time <= 30d| H["Trigger High-Priority Warning Notification to Billing"]
    F -->|Balance = 0 OR Expired| I["Block Future Shift Staffing"]
```

### Process Steps & Endpoints
1. **Ingest Authorization**:
   - Client Portal (`POST /api/v1/clients/me/authorizations`): Ingests with `source = 'client'`, `status = 'pending'`.
   - Admin Portal (`POST /api/v1/admin/authorizations`): Direct entry with `source = 'admin'`.
2. **Review & Activation (`POST /api/v1/admin/authorizations/<id>/review`)**: Sets authorized units, HCPCS code (`T1019`), unit type (`15_min`, `hourly`, `visit`), and weekly hour ceilings.
3. **Burndown Monitoring (`GET /api/v1/admin/authorizations/<id>`)**: Computes real-time unit balance and burn percentage.

---

## 7. Process 6: Clinical Care Directives, Scheduling & Staffing (Pre-Assignment Gate)

Connects admitted clients with qualified caregivers while enforcing automated, hard compliance barriers.

```mermaid
flowchart TD
    Start["Admin Assigns Caregiver to Client Shift<br/>POST /api/v1/admin/clients/:client_id/assignments"] --> GateCheck{"Pre-Assignment Compliance Gate"}
    
    GateCheck -->|Check 1| C1{"Caregiver User Status == 'active'?"}
    C1 -->|No| Block["HALT with HTTP 400<br/>'Caregiver account is not active'"]
    
    C1 -->|Yes| C2{"All State-Mandatory Documents<br/>Approved & Unexpired?"}
    C2 -->|No| BlockDocs["HALT with HTTP 400<br/>List Missing / Expired Credentials"]
    
    C2 -->|Yes| C3{"Mandatory In-Service Training<br/>Completed within 12 Months?"}
    C3 -->|No| BlockTrain["HALT with HTTP 400<br/>List Incomplete Courses"]
    
    C3 -->|Yes| C4{"Weekly Hours <= Authorization Cap?"}
    C4 -->|No| BlockHours["HALT with HTTP 400<br/>'Exceeds weekly authorized hours'"]
    
    C4 -->|Yes| Pass["Create caregiver_client_assignments<br/>Create care_schedules record"]
    Pass --> Notify["Notify Caregiver & Client<br/>Care Plan & Schedule visible in Portals"]
```

### Process Steps & Endpoints
1. **Care Plan Authoring (`POST /api/v1/admin/clients/<id>/care-plan`)**: Defines primary nurse, emergency contact protocol, and specific Activities of Daily Living (ADLs) with task frequencies.
2. **Weekly Shift Scheduling (`POST /api/v1/admin/clients/<id>/schedule`)**: Sets day-of-week, start/end hours, and service type.
3. **Pre-Assignment Compliance Verification (`POST /api/v1/admin/clients/<id>/assignments`)**:
   - Validates caregiver active account status.
   - Validates that all required state credentials exist, are approved, and have not expired.
   - Validates completion of all mandatory continuing education courses.
   - Rejects uncompliant assignments with specific diagnostic errors.
4. **Caregiver View (`GET /api/v1/caregivers/me/clients/<id>/care-plan`)**: Assigned caregiver receives scoped, read-only access to client directives and daily tasks.

---

## 8. Process 7: Document Management & Compliance Review Engine

Centralized ingestion and audit engine for all state and federal regulatory filings using built-in Django media storage (`backend/media/`, proxied via Vite `/media`) with cryptographic HMAC signed tokens.

```mermaid
sequenceDiagram
    autonumber
    actor User as Caregiver / Client
    participant Frontend as Web Client
    participant API as Documents API
    participant Media as Django Media Storage (MEDIA_ROOT)
    actor Admin as State Administrator

    User->>Frontend: Select document file (PDF / PNG)
    Frontend->>API: POST /api/v1/documents/upload-intent {document_type_id, filename}
    API-->>Frontend: 200 OK {upload_url: "/api/v1/documents/:id/upload-file/?token=:sig", document_id}
    Frontend->>API: PUT /api/v1/documents/:id/upload-file/?token=:sig with binary stream
    API->>Media: default_storage.save(storage_key, file)
    API-->>Frontend: 200 OK (Uploaded & marked pending_review)
    
    Admin->>API: GET /api/v1/admin/documents (Filter: status=pending_review)
    API-->>Admin: Documents awaiting verification
    Admin->>API: GET /api/v1/documents/:id/download-url
    API-->>Admin: 200 OK {download_url: "/api/v1/documents/:id/file/?token=:sig"}
    Admin->>Frontend: Opens download_url in new tab (window.open)
    Frontend->>API: GET /api/v1/documents/:id/file/?token=:sig
    API->>Media: Stream file via FileResponse
    API-->>Frontend: Binary PDF/image displayed
    Admin->>API: POST /api/v1/admin/documents/:id/review {status: 'approved' | 'rejected', notes}
    API-->>Admin: 200 OK Document approved or returned to user
```

### Document Status Transitions
- `pending_review` $\rightarrow$ `approved` (Valid credential, expiration recorded).
- `pending_review` $\rightarrow$ `rejected` (Illegible, wrong type, or invalid issuer).
- `approved` $\rightarrow$ `expired` (Automated nightly expiration scanner detects date reached).

---

## 9. Process 8: Platform Governance, Audit Trails, Retention & User Administration

Maintains multi-tenant isolation, HIPAA compliance evidence, and account access.

```mermaid
flowchart TD
    subgraph Security ["1. RBAC & Multi-Tenant State Isolation"]
        Req["Inbound Request (Bearer JWT)"] --> Check{"User Scope Check"}
        Check -->|Super Admin| AllStates["Access All Jurisdictions (FL, IN, GA)"]
        Check -->|Administrator| StateLock["Filter strictly by user.state_id<br/>(Cross-state attempts return HTTP 403)"]
        Check -->|Caregiver / Client| SelfOnly["Filter strictly to owned records"]
    end

    subgraph Audit ["2. Append-Only Audit Logging"]
        Mutation["Record Mutation (Create, Update, Soft-Delete)"] --> Logger["apps.compliance.audit.record_audit_log()"]
        Logger --> LogTable[("audit_logs Table<br/>Stores User, Action, Diff, IP, Request ID")]
    end

    subgraph Retention ["3. HIPAA 7-Year Retention & Legal Hold"]
        SoftDel["Soft Deletion (deleted_at = NOW)"] --> Nightly["Nightly Purge Daemon"]
        Nightly --> HoldCheck{"legal_hold == TRUE?"}
        HoldCheck -->|Yes| Retain["Protected from Deletion indefinitely"]
        HoldCheck -->|No| AgeCheck{"deleted_at > 7 Years?"}
        AgeCheck -->|Yes| HardPurge["Permanent Purge"]
        AgeCheck -->|No| KeepSoft["Retain in DB"]
    end
```

### Process Steps & Endpoints
1. **User Administration (`GET /api/v1/admin/users`)**: Search, filter, and inspect users across roles and jurisdictions.
2. **Account Status Control (`PATCH /api/v1/admin/users/<id>/status`)**: Transition accounts between `active`, `inactive`, and `suspended`.
3. **Role & Jurisdiction Management (`PATCH /api/v1/admin/users/<id>/role`, `/state`)**: Super Administrator reassignments of staff roles and regional oversight.
4. **Legal Hold Management (`POST /api/v1/admin/<resource>/<id>/legal-hold`)**: Flips legal hold flag to freeze records during regulatory inquiries.
5. **Entity Restoration (`POST /api/v1/admin/<resource>/<id>/restore`)**: Reverses soft-deletion before the 7-year purge horizon.
6. **Announcements Broadcast (`POST /api/v1/admin/announcements`)**: Broadcasts state-wide or role-targeted bulletins.
7. **Compliance Audit Trail (`GET /api/v1/admin/audit-logs`)**: Searchable, immutable record of all system events.

---

## 10. Summary of Business Domain Processes & Technical Mapping

| Domain / Process | Primary Endpoints | Database Entities Involved | Primary Outcome |
|---|---|---|---|
| **Marketing & Leads** | `GET /api/v1/states/:state/*`<br/>`POST /api/v1/states/:state/contact` | `website_content`, `services`, `job_postings`, `client_referrals` | Ingestion of qualified client inquiries into regional agency triage pipelines. |
| **Caregiver Onboarding** | `POST /api/v1/caregivers/apply-public`<br/>`POST /api/v1/admin/caregivers/:id/review` | `users`, `caregivers`, `caregiver_applications`, `documents` | Atomic applicant registration, background verification, credentialing approval. |
| **Continuing Education** | `GET /api/v1/training/courses`<br/>`POST /api/v1/training/courses/:id/complete` | `training_courses`, `training_enrollments` | Verification of continuing education hours and serialized completion certificates. |
| **Client Admission** | `POST /api/v1/clients/intake`<br/>`POST /api/v1/clients/me/agreements/:key/sign`<br/>`POST /api/v1/admin/clients/:id/admission` | `clients`, `client_agreements`, `client_referrals` | Complete digital medical intake, binding legal agreements, and active patient admission. |
| **Prior Authorization** | `POST /api/v1/admin/authorizations`<br/>`POST /api/v1/admin/authorizations/:id/review` | `authorizations`, `documents` | Continuous validation of Medicaid/insurance billing units and weekly hours limits. |
| **Care Directives & Staffing** | `POST /api/v1/admin/clients/:id/care-plan`<br/>`POST /api/v1/admin/clients/:id/schedule`<br/>`POST /api/v1/admin/clients/:id/assignments` | `care_plans`, `care_plan_activities`, `care_schedules`, `caregiver_client_assignments` | Structured ADL care directives, schedule planning, and pre-assignment credential validation. |
| **Compliance & Storage** | `POST /api/v1/documents/upload-intent`<br/>`PUT /api/v1/documents/:id/upload-file`<br/>`POST /api/v1/admin/documents/:id/review` | `document_types`, `document_requirements`, `documents` | Django media storage & HMAC signed tokens, multi-jurisdiction compliance matrix enforcement. |
| **System Governance** | `GET /api/v1/admin/audit-logs`<br/>`POST /api/v1/admin/:res/:id/legal-hold`<br/>`PATCH /api/v1/admin/users/:id/*` | `users`, `roles`, `states`, `audit_logs`, `announcements`, `notifications` | Fail-closed state isolation, HIPAA legal hold protection, and tamper-evident audit logging. |
