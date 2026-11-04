# Database Schema & Data Dictionary — Caregiver Platform

> **Scope authority (2026-11-05):** [Scope of work.md](Scope%20of%20work.md) is the sole product requirements baseline. Read [AGENT_BUILD_GUIDE.md](AGENT_BUILD_GUIDE.md) before using this reference. Build basic functioning flows while agency processes remain pending. Technical examples and existing features below do not establish client approval, scope completion, or additional product requirements.

## Schema reference status

The SQL and dictionary below are historical design references, not an executable migration or proof of the installed schema. Current Django models and migrations determine stored fields and enums. Reconcile relevant documentation and frontend constants with those definitions; do not change production data merely to match this DDL.

Authorization unit/billing columns, staffing structures and legal-hold/soft-delete fields may support existing code, but do not establish required agency workflows. The Scope of Work does not authorize automatic unit consumption, an assignment gate, or timed purging. Do not delete existing fields or controls because they are outside explicit scope. Exact document requirements, statuses, course validity and retention policy need agency confirmation; reference seeds are not that confirmation.

## 1. Schema Design Principles & PostgreSQL Standard

This schema is designed for **PostgreSQL 16+** as an enterprise, self-contained relational database:
1. **Self-Contained Identity & Authentication**: Eliminates external auth schemas (`auth.users`). User credentials and password hashes (`password_hash VARCHAR(255)`) reside securely in the standard `users` table.
2. **UUID Primary Keys**: Entity identifiers use standard PostgreSQL `UUID` generated via `gen_random_uuid()`.
3. **Audit-Safe Soft Deletion**: Operational tables feature `deleted_at TIMESTAMPTZ NULL` and `deleted_by UUID NULL REFERENCES users(id)`. Raw unique constraints are replaced with **partial unique indexes** (`WHERE deleted_at IS NULL`) to permit re-registration and re-enrollment.
4. **Legal Hold Immunity**: Sensitive tables include `legal_hold BOOLEAN NOT NULL DEFAULT FALSE` to protect records during legal proceedings from automated retention purges.
5. **State Multi-Tenancy Boundary**: State isolation is enforced by storing `state_id INTEGER REFERENCES states(id)` across all operational entities.
6. **Query Optimization**: High-volume list queries are backed by composite partial indexes: `(state_id, <sort_col>) WHERE deleted_at IS NULL`.
7. **Django ORM Model Mapping**: All database entities map directly to idiomatic Django models inheriting from `models.Model`, integrating seamlessly into Django REST Framework serializers and viewsets.
8. **Django Migrations Framework**: Schema evolution and database versioning are managed deterministically using Django's built-in migration engine (`python manage.py makemigrations` and `python manage.py migrate`).

---

## 2. Complete PostgreSQL 16 DDL Specification

```sql
-- ============================================================================
-- 1. EXTENSIONS & GLOBAL UTILITIES
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Automatic timestamp maintenance trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. CORE IDENTITY & MULTI-TENANT BOUNDARIES
-- ============================================================================

CREATE TABLE states (
    id SERIAL PRIMARY KEY,
    code VARCHAR(2) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_states_updated_at
BEFORE UPDATE ON states
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Django built-in auth password hash (Argon2id / PBKDF2)
    role_id INTEGER NOT NULL REFERENCES roles(id),
    state_id INTEGER REFERENCES states(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE UNIQUE INDEX idx_users_email_live ON users (lower(email)) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_state_role ON users (state_id, role_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 3. PUBLIC MARKETING & STATE CMS
-- ============================================================================

CREATE TABLE website_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id INTEGER NOT NULL REFERENCES states(id),
    section_key VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_website_content_state_section ON website_content (state_id, section_key) WHERE deleted_at IS NULL;

CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id INTEGER NOT NULL REFERENCES states(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    icon_name VARCHAR(50),
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_services_state_sort ON services (state_id, sort_order) WHERE deleted_at IS NULL;

CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id INTEGER NOT NULL REFERENCES states(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_forms_state ON forms (state_id) WHERE deleted_at IS NULL;

CREATE TABLE licensing_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id INTEGER NOT NULL REFERENCES states(id),
    license_number VARCHAR(100) NOT NULL,
    issuing_authority VARCHAR(200) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    verified_at TIMESTAMPTZ,
    disclosures TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id INTEGER NOT NULL REFERENCES states(id),
    title VARCHAR(200) NOT NULL,
    department VARCHAR(100) NOT NULL DEFAULT 'Caregiver Services',
    employment_type VARCHAR(50) NOT NULL DEFAULT 'Full-Time',
    description TEXT NOT NULL,
    requirements TEXT NOT NULL,
    compensation VARCHAR(100),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_job_postings_state_active ON job_postings (state_id, active) WHERE deleted_at IS NULL;

-- ============================================================================
-- 4. CAREGIVER DOMAIN
-- ============================================================================

CREATE TABLE caregivers (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    state_id INTEGER NOT NULL REFERENCES states(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    date_of_birth DATE,
    ssn_last4 VARCHAR(4),
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE TRIGGER trg_caregivers_updated_at
BEFORE UPDATE ON caregivers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_caregivers_state ON caregivers (state_id, last_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_caregivers_legal_hold ON caregivers (legal_hold) WHERE legal_hold = TRUE;

CREATE TABLE caregiver_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
    state_id INTEGER NOT NULL REFERENCES states(id),
    status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'onboarding')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    notes TEXT,
    rejection_reason TEXT,
    signature_data TEXT NOT NULL,
    signed_name VARCHAR(200) NOT NULL,
    signed_at TIMESTAMPTZ NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    content_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE TRIGGER trg_caregiver_applications_updated_at
BEFORE UPDATE ON caregiver_applications
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_caregiver_applications_state_status ON caregiver_applications (state_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_caregiver_applications_caregiver ON caregiver_applications (caregiver_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 5. CLIENT DOMAIN
-- ============================================================================

CREATE TABLE clients (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    state_id INTEGER NOT NULL REFERENCES states(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    medicaid_number VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'discharged', 'rejected')),
    service_start_date DATE,
    admitted_by UUID REFERENCES users(id),
    admitted_at TIMESTAMPTZ,
    admission_notes TEXT,
    rejection_reason TEXT,
    signature_data TEXT,
    signed_name VARCHAR(200),
    signed_at TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE TRIGGER trg_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_clients_state_status ON clients (state_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_legal_hold ON clients (legal_hold) WHERE legal_hold = TRUE;

CREATE TABLE client_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id INTEGER NOT NULL REFERENCES states(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    referral_source VARCHAR(100) NOT NULL DEFAULT 'Website',
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'closed')),
    assigned_to UUID REFERENCES users(id),
    handled_notes TEXT,
    converted_client_id UUID REFERENCES clients(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE TRIGGER trg_client_referrals_updated_at
BEFORE UPDATE ON client_referrals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_client_referrals_state_status ON client_referrals (state_id, status) WHERE deleted_at IS NULL;

-- Append-only legal agreements table
CREATE TABLE client_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES users(id),
    state_id INTEGER NOT NULL REFERENCES states(id),
    agreement_key VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    body TEXT NOT NULL,
    signature_data TEXT NOT NULL,
    signed_name VARCHAR(200) NOT NULL,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    content_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_agreements_client_key ON client_agreements (client_id, agreement_key);

-- ============================================================================
-- 6. DOCUMENT STORAGE & COMPLIANCE REQUIREMENTS
-- ============================================================================

CREATE TABLE document_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    for_role VARCHAR(20) NOT NULL DEFAULT 'both' CHECK (for_role IN ('caregiver', 'client', 'both')),
    requires_expiration BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE document_requirements (
    id SERIAL PRIMARY KEY,
    state_id INTEGER NOT NULL REFERENCES states(id),
    document_type_id INTEGER NOT NULL REFERENCES document_types(id),
    for_role VARCHAR(20) NOT NULL DEFAULT 'caregiver' CHECK (for_role IN ('caregiver', 'client', 'both')),
    required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (state_id, document_type_id, for_role)
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type_id INTEGER NOT NULL REFERENCES document_types(id),
    state_id INTEGER NOT NULL REFERENCES states(id),
    storage_path TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'expired')),
    expiration_date DATE,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE TRIGGER trg_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_documents_state_status ON documents (state_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_owner ON documents (owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_expiration ON documents (expiration_date) WHERE status = 'approved' AND deleted_at IS NULL;

-- ============================================================================
-- 7. PRIOR AUTHORIZATIONS & BURNDOWN
-- ============================================================================

CREATE TABLE authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    state_id INTEGER NOT NULL REFERENCES states(id),
    caregiver_id UUID REFERENCES caregivers(id),
    authorization_number VARCHAR(100) NOT NULL,
    hcpcs_code VARCHAR(20) NOT NULL DEFAULT 'T1019',
    service_description VARCHAR(150) NOT NULL DEFAULT 'Personal Care Services',
    unit_type VARCHAR(20) NOT NULL DEFAULT '15_min' CHECK (unit_type IN ('15_min', 'hourly', 'visit')),
    total_units_authorized INTEGER NOT NULL DEFAULT 0,
    units_used INTEGER NOT NULL DEFAULT 0,
    max_weekly_hours NUMERIC(4,2),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expiring_soon', 'expired', 'rejected')),
    source VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'client')),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    document_id UUID REFERENCES documents(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE TRIGGER trg_authorizations_updated_at
BEFORE UPDATE ON authorizations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_authorizations_state_status ON authorizations (state_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_authorizations_client ON authorizations (client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_authorizations_end_date ON authorizations (end_date) WHERE status = 'active' AND deleted_at IS NULL;

-- ============================================================================
-- 8. CARE DIRECTIVES, SCHEDULING & STAFFING
-- ============================================================================

CREATE TABLE care_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    state_id INTEGER NOT NULL REFERENCES states(id),
    caregiver_id UUID REFERENCES caregivers(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    primary_nurse VARCHAR(200) NOT NULL,
    emergency_protocol TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE TRIGGER trg_care_plans_updated_at
BEFORE UPDATE ON care_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_care_plans_state ON care_plans (state_id) WHERE deleted_at IS NULL;

CREATE TABLE care_plan_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_plan_id UUID NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
    task VARCHAR(200) NOT NULL,
    frequency VARCHAR(100) NOT NULL DEFAULT 'Daily',
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_care_plan_activities_plan ON care_plan_activities (care_plan_id, sort_order) WHERE deleted_at IS NULL;

CREATE TABLE care_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    caregiver_id UUID REFERENCES caregivers(id),
    state_id INTEGER NOT NULL REFERENCES states(id),
    day_of_week VARCHAR(20) NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    service VARCHAR(200) NOT NULL DEFAULT 'Personal Care',
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_care_schedules_client ON care_schedules (client_id, day_of_week) WHERE deleted_at IS NULL;
CREATE INDEX idx_care_schedules_caregiver ON care_schedules (caregiver_id, day_of_week) WHERE deleted_at IS NULL;

CREATE TABLE caregiver_client_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    role VARCHAR(40) NOT NULL DEFAULT 'primary' CHECK (role IN ('primary', 'relief', 'backup')),
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_unique_active_assignment 
ON caregiver_client_assignments (caregiver_id, client_id) 
WHERE ended_at IS NULL;

-- ============================================================================
-- 9. TRAINING & IN-SERVICE CERTIFICATIONS
-- ============================================================================

CREATE TABLE training_courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    duration_hours NUMERIC(4,1) NOT NULL DEFAULT 1.0,
    validity_months INTEGER NOT NULL DEFAULT 12,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE training_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
    caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    due_at DATE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (course_id, caregiver_id)
);

CREATE INDEX idx_training_enrollments_due ON training_enrollments (caregiver_id, due_at);

-- ============================================================================
-- 10. COMPLIANCE AUDITING, NOTIFICATIONS & BROADCASTS
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_id UUID,
    entity_state_id INTEGER REFERENCES states(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_table_record ON audit_logs (table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    reference_id VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id, read) WHERE read = FALSE;
CREATE UNIQUE INDEX idx_notifications_reference ON notifications (user_id, reference_id) WHERE reference_id IS NOT NULL;

CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id INTEGER REFERENCES states(id),
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    audience VARCHAR(50) NOT NULL DEFAULT 'all' CHECK (audience IN ('caregiver', 'client', 'all', 'administrator')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_announcements_audience ON announcements (state_id, audience, active) WHERE deleted_at IS NULL;

-- ============================================================================
-- 11. ATOMIC STORED PROCEDURE FOR ONBOARDING
-- ============================================================================

CREATE OR REPLACE FUNCTION create_caregiver_application_atomic(
    p_user_id UUID,
    p_email VARCHAR,
    p_password_hash VARCHAR,
    p_state_id INTEGER,
    p_first_name VARCHAR,
    p_last_name VARCHAR,
    p_phone VARCHAR,
    p_dob DATE,
    p_ssn_last4 VARCHAR,
    p_signature TEXT,
    p_signed_name VARCHAR,
    p_content_hash TEXT
)
RETURNS UUID AS $$
DECLARE
    v_app_id UUID;
BEGIN
    -- 1. Insert user credentials
    INSERT INTO users (id, email, password_hash, role_id, state_id, status)
    VALUES (p_user_id, lower(p_email), p_password_hash, 3, p_state_id, 'active')
    ON CONFLICT (id) DO UPDATE SET 
        state_id = EXCLUDED.state_id,
        updated_at = NOW();

    -- 2. Upsert caregiver profile
    INSERT INTO caregivers (id, state_id, first_name, last_name, phone, date_of_birth, ssn_last4)
    VALUES (p_user_id, p_state_id, p_first_name, p_last_name, p_phone, p_dob, p_ssn_last4)
    ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        date_of_birth = EXCLUDED.date_of_birth,
        ssn_last4 = EXCLUDED.ssn_last4,
        updated_at = NOW();

    -- 3. Insert submitted application record
    v_app_id := gen_random_uuid();
    INSERT INTO caregiver_applications (
        id, caregiver_id, state_id, status, submitted_at,
        signature_data, signed_name, signed_at, version, content_hash
    )
    VALUES (
        v_app_id, p_user_id, p_state_id, 'submitted', NOW(),
        p_signature, p_signed_name, NOW(), 1, p_content_hash
    );

    RETURN v_app_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. Data Dictionary

### Group 1: Core Multi-Tenant & Identity Tables

#### Table: `states`
Operating jurisdictions representing geographic multi-tenancy boundaries.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `SERIAL` | No | Auto | Primary key state identifier (1: FL, 2: IN, 3: GA). |
| `code` | `VARCHAR(2)` | No | None | Postal abbreviation (FL, IN, GA). Unique. |
| `name` | `VARCHAR(50)` | No | None | Full legal state name. Unique. |
| `slug` | `VARCHAR(50)` | No | None | URL routing slug (`florida`, `indiana`, `georgia`). Unique. |
| `active` | `BOOLEAN` | No | `TRUE` | Whether agency is actively taking clients in this state. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp. |

#### Table: `roles`
System access privilege tiers.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `SERIAL` | No | Auto | Primary key role identifier. |
| `name` | `VARCHAR(50)` | No | None | Unique role key: `super_admin`, `administrator`, `caregiver`, `client`. |
| `description` | `TEXT` | Yes | None | Operational scope description. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Role registration timestamp. |

#### Table: `users`
Central user credential and authorization profile table.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key user ID managed by Django custom user model. |
| `email` | `VARCHAR(255)` | No | None | Case-insensitive email address. Unique among active rows. |
| `password_hash` | `VARCHAR(255)` | No | None | Salted password hash managed by Django built-in auth (Argon2id / PBKDF2). |
| `role_id` | `INTEGER` | No | None | FK -> `roles.id`. System privilege level. |
| `state_id` | `INTEGER` | Yes | None | FK -> `states.id`. Scoped jurisdiction. Must be NULL for `super_admin`. |
| `status` | `VARCHAR(20)` | No | `'active'` | Account status: `active`, `inactive`, `suspended`. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Account creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last modification timestamp. |
| `deleted_at` | `TIMESTAMPTZ` | Yes | None | Soft-deletion timestamp. Null for active rows. |
| `deleted_by` | `UUID` | Yes | None | FK -> `users.id`. Administrator who executed soft delete. |

---

### Group 2: Caregiver Domain Tables

#### Table: `caregivers`
Caregiver demographics and personal background.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | No | None | Primary key referencing `users.id` (1:1 relationship). |
| `state_id` | `INTEGER` | No | None | FK -> `states.id`. State of authorized employment. |
| `first_name` | `VARCHAR(100)` | No | None | Legal first name. |
| `last_name` | `VARCHAR(100)` | No | None | Legal last name. |
| `phone` | `VARCHAR(20)` | Yes | None | Primary contact telephone number. |
| `address` | `TEXT` | Yes | None | Residential street address. |
| `date_of_birth` | `DATE` | Yes | None | Date of birth for background screening. |
| `ssn_last4` | `VARCHAR(4)` | Yes | None | Last 4 digits of Social Security Number. |
| `legal_hold` | `BOOLEAN` | No | `FALSE` | Immunity flag preventing automated retention purges. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last modification timestamp. |
| `deleted_at` | `TIMESTAMPTZ` | Yes | None | Soft-deletion timestamp. |
| `deleted_by` | `UUID` | Yes | None | Deleting administrator user ID. |

#### Table: `caregiver_applications`
Applicant intake, electronic signatures, and approval status.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key application ID. |
| `caregiver_id` | `UUID` | No | None | FK -> `caregivers.id`. Associated applicant profile. |
| `state_id` | `INTEGER` | No | None | FK -> `states.id`. Target employment jurisdiction. |
| `status` | `VARCHAR(20)` | No | `'submitted'` | Funnel state: `draft`, `submitted`, `under_review`, `approved`, `rejected`, `onboarding`. |
| `submitted_at` | `TIMESTAMPTZ` | No | `NOW()` | Initial application submission timestamp. |
| `reviewed_at` | `TIMESTAMPTZ` | Yes | None | Timestamp of admin review action. |
| `reviewed_by` | `UUID` | Yes | None | FK -> `users.id`. Reviewing administrator. |
| `notes` | `TEXT` | Yes | None | Internal administrative review comments. |
| `rejection_reason` | `TEXT` | Yes | None | Mandatory explanation provided if status is `rejected`. |
| `signature_data` | `TEXT` | No | None | Base64 encoded PNG digital signature canvas data. |
| `signed_name` | `VARCHAR(200)` | No | None | Legal printed name entered at signing. |
| `signed_at` | `TIMESTAMPTZ` | No | None | Digital signature execution timestamp. |
| `version` | `INTEGER` | No | `1` | Schema version of the application form packet. |
| `content_hash` | `TEXT` | No | None | SHA-256 cryptographic digest of application contents. |
| `deleted_at` | `TIMESTAMPTZ` | Yes | None | Soft-delete timestamp. |

---

### Group 3: Client Domain Tables

#### Table: `clients`
Patient clinical profile and intake lifecycle.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | No | None | Primary key referencing `users.id` (1:1 relationship). |
| `state_id` | `INTEGER` | No | None | FK -> `states.id`. Patient jurisdiction. |
| `first_name` | `VARCHAR(100)` | No | None | Legal first name. |
| `last_name` | `VARCHAR(100)` | No | None | Legal last name. |
| `date_of_birth` | `DATE` | No | None | Date of birth. |
| `phone` | `VARCHAR(20)` | Yes | None | Contact telephone. |
| `address` | `TEXT` | Yes | None | Service delivery physical address. |
| `medicaid_number` | `VARCHAR(50)` | Yes | None | State Medicaid or insurance subscriber ID. |
| `status` | `VARCHAR(20)` | No | `'pending'` | Lifecycle: `pending`, `approved`, `active`, `discharged`, `rejected`. |
| `service_start_date` | `DATE` | Yes | None | Date home health services formally begin. |
| `admitted_by` | `UUID` | Yes | None | FK -> `users.id`. Admitting clinical director. |
| `admitted_at` | `TIMESTAMPTZ` | Yes | None | Formal admission timestamp. |
| `admission_notes` | `TEXT` | Yes | None | Clinical intake assessment notes. |
| `rejection_reason` | `TEXT` | Yes | None | Rationale if admission is declined. |
| `signature_data` | `TEXT` | Yes | None | Base64 signature canvas for digital intake consent. |
| `signed_name` | `VARCHAR(200)` | Yes | None | Printed legal name of signer. |
| `signed_at` | `TIMESTAMPTZ` | Yes | None | Timestamp of digital intake consent. |
| `legal_hold` | `BOOLEAN` | No | `FALSE` | Immunity flag preventing automated retention purges. |
| `deleted_at` | `TIMESTAMPTZ` | Yes | None | Soft-delete timestamp. |

#### Table: `client_referrals`
Prospective inquiries from web forms, case managers, or hospital discharges.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key referral record. |
| `state_id` | `INTEGER` | No | None | FK -> `states.id`. Jurisdiction of inquiry. |
| `first_name` | `VARCHAR(100)` | No | None | Prospect or contact first name. |
| `last_name` | `VARCHAR(100)` | No | None | Prospect or contact last name. |
| `phone` | `VARCHAR(20)` | No | None | Inquirer phone number. |
| `email` | `VARCHAR(255)` | Yes | None | Inquirer email. |
| `referral_source` | `VARCHAR(100)` | No | `'Website'` | Channel (e.g., Hospital, Doctor, Website Form). |
| `notes` | `TEXT` | Yes | None | Clinical needs description or inquiry notes. |
| `status` | `VARCHAR(20)` | No | `'new'` | Triage stage: `new`, `contacted`, `converted`, `closed`. |
| `assigned_to` | `UUID` | Yes | None | FK -> `users.id`. Assigned intake coordinator. |
| `handled_notes` | `TEXT` | Yes | None | Staff follow-up documentation. |
| `converted_client_id` | `UUID` | Yes | None | FK -> `clients.id`. Linked patient upon conversion. |
| `deleted_at` | `TIMESTAMPTZ` | Yes | None | Soft-delete timestamp. |

#### Table: `client_agreements`
Immutable append-only legal agreements executed by clients.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key agreement record. |
| `client_id` | `UUID` | No | None | FK -> `users.id`. Signer user ID. |
| `state_id` | `INTEGER` | No | None | FK -> `states.id`. Governing jurisdiction. |
| `agreement_key` | `VARCHAR(100)` | No | None | Unique key (`care_agreement`, `hipaa_disclosure`, `client_rights`). |
| `title` | `VARCHAR(200)` | No | None | Human-readable agreement document title. |
| `version` | `INTEGER` | No | `1` | Document version number. |
| `body` | `TEXT` | No | None | Full legal text rendered at signing. |
| `signature_data` | `TEXT` | No | None | Base64 digital signature stroke data. |
| `signed_name` | `VARCHAR(200)` | No | None | Name attested by signer. |
| `signed_at` | `TIMESTAMPTZ` | No | `NOW()` | Timestamp of electronic signing. |
| `content_hash` | `TEXT` | No | None | Cryptographic SHA-256 integrity hash. |

---

### Group 4: Authorizations & Billing Burndown

#### Table: `authorizations`
Payer prior authorizations and clinical unit caps.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key authorization ID. |
| `client_id` | `UUID` | No | None | FK -> `clients.id`. Authorized patient. |
| `state_id` | `INTEGER` | No | None | FK -> `states.id`. Payer jurisdiction. |
| `caregiver_id` | `UUID` | Yes | None | FK -> `caregivers.id`. Optional restricted aide. |
| `authorization_number`| `VARCHAR(100)` | No | None | Insurance or Medicaid reference code. |
| `hcpcs_code` | `VARCHAR(20)` | No | `'T1019'` | Standard billing procedure code. |
| `service_description` | `VARCHAR(150)` | No | `'Personal Care Services'` | Covered service description. |
| `unit_type` | `VARCHAR(20)` | No | `'15_min'` | Unit metric: `15_min`, `hourly`, `visit`. |
| `total_units_authorized`| `INTEGER` | No | `0` | Payer allocated unit quota. |
| `units_used` | `INTEGER` | No | `0` | Units billed or consumed to date. |
| `max_weekly_hours` | `NUMERIC(4,2)`| Yes | None | Weekly service cap limit. |
| `start_date` | `DATE` | No | None | Authorization validity start date. |
| `end_date` | `DATE` | No | None | Authorization expiration date. |
| `status` | `VARCHAR(20)` | No | `'pending'` | `pending`, `active`, `expiring_soon`, `expired`, `rejected`. |
| `source` | `VARCHAR(20)` | No | `'admin'` | Ingestion channel: `admin` or `client`. |
| `reviewed_at` | `TIMESTAMPTZ` | Yes | None | Admin verification timestamp. |
| `reviewed_by` | `UUID` | Yes | None | FK -> `users.id`. Verifying administrator. |
| `document_id` | `UUID` | Yes | None | FK -> `documents.id`. Attached approval letter. |
| `deleted_at` | `TIMESTAMPTZ` | Yes | None | Soft-delete timestamp. |

---

### Group 5: Care Directives, Scheduling & Staffing

#### Table: `care_plans`
Clinical care directives per patient.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key care plan ID. |
| `client_id` | `UUID` | No | None | Unique FK -> `users.id` (1:1 active plan per client). |
| `state_id` | `INTEGER` | No | None | FK -> `states.id`. Clinical jurisdiction. |
| `caregiver_id` | `UUID` | Yes | None | FK -> `caregivers.id`. Assigned primary aide. |
| `status` | `VARCHAR(20)` | No | `'active'` | Status: `active`, `pending`, `inactive`. |
| `effective_date` | `DATE` | No | `CURRENT_DATE` | Date directives become active. |
| `primary_nurse` | `VARCHAR(200)` | No | None | Authorizing Registered Nurse name. |
| `emergency_protocol` | `TEXT` | No | None | Escalation steps for acute emergencies. |
| `created_by` | `UUID` | No | None | FK -> `users.id`. Authoring staff member. |
| `deleted_at` | `TIMESTAMPTZ` | Yes | None | Soft-delete timestamp. |

#### Table: `care_plan_activities`
Granular Activities of Daily Living (ADLs).

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key activity record. |
| `care_plan_id` | `UUID` | No | None | FK -> `care_plans.id` (ON DELETE CASCADE). |
| `task` | `VARCHAR(200)` | No | None | Clinical task description (e.g., "Bathing assistance"). |
| `frequency` | `VARCHAR(100)` | No | `'Daily'` | Schedule frequency (e.g., "Daily", "Mon/Wed/Fri"). |
| `notes` | `TEXT` | Yes | None | Specific instructions or precautions. |
| `sort_order` | `INTEGER` | No | `0` | Visual display ordering index. |
| `deleted_at` | `TIMESTAMPTZ` | Yes | None | Soft-delete timestamp. |

#### Table: `care_schedules`
Recurring weekly visit shifts.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key shift block ID. |
| `client_id` | `UUID` | No | None | FK -> `users.id`. Patient recipient. |
| `caregiver_id` | `UUID` | Yes | None | FK -> `caregivers.id`. Assigned worker. |
| `state_id` | `INTEGER` | No | None | FK -> `states.id`. Jurisdiction. |
| `day_of_week` | `VARCHAR(20)` | No | None | Day name: Monday through Sunday. |
| `start_time` | `TIME` | No | None | Shift start time. |
| `end_time` | `TIME` | No | None | Shift end time. |
| `service` | `VARCHAR(200)` | No | `'Personal Care'` | Service delivered during shift. |
| `notes` | `TEXT` | Yes | None | Shift instructions. |
| `status` | `VARCHAR(20)` | No | `'scheduled'` | `scheduled`, `confirmed`, `completed`, `cancelled`. |
| `deleted_at` | `TIMESTAMPTZ` | Yes | None | Soft-delete timestamp. |

#### Table: `caregiver_client_assignments`
Active staffing connections connecting caregivers to patients.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key assignment link. |
| `caregiver_id` | `UUID` | No | None | FK -> `caregivers.id` (ON DELETE CASCADE). |
| `client_id` | `UUID` | No | None | FK -> `clients.id` (ON DELETE CASCADE). |
| `role` | `VARCHAR(40)` | No | `'primary'` | Assignment tier: `primary`, `relief`, `backup`. |
| `assigned_by` | `UUID` | No | None | FK -> `users.id`. Authorizing coordinator. |
| `assigned_at` | `TIMESTAMPTZ` | No | `NOW()` | Start date of assignment relationship. |
| `ended_at` | `TIMESTAMPTZ` | Yes | None | Termination timestamp (NULL = active). |

---

### Group 6: Documents, Training & Audit Trail

#### Table: `documents`
Uploaded credentials, medical records, and attachments stored in S3.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key document record. |
| `owner_id` | `UUID` | No | None | FK -> `users.id`. Document uploader. |
| `document_type_id` | `INTEGER` | No | None | FK -> `document_types.id`. Standard category. |
| `state_id` | `INTEGER` | No | None | FK -> `states.id`. Jurisdiction. |
| `storage_path` | `TEXT` | No | None | S3 object key (e.g., `documents/cpr/xyz.pdf`). |
| `status` | `VARCHAR(20)` | No | `'pending_review'` | `pending_review`, `approved`, `rejected`, `expired`. |
| `expiration_date` | `DATE` | Yes | None | Credential expiry date. |
| `reviewed_at` | `TIMESTAMPTZ` | Yes | None | Admin review timestamp. |
| `reviewed_by` | `UUID` | Yes | None | FK -> `users.id`. Reviewing administrator. |
| `rejection_reason` | `TEXT` | Yes | None | Document deficiency explanation. |
| `legal_hold` | `BOOLEAN` | No | `FALSE` | Immunity flag preventing purge. |
| `deleted_at` | `TIMESTAMPTZ` | Yes | None | Soft-delete timestamp. |

#### Table: `audit_logs`
Immutable compliance audit log for HIPAA accounting and administrative forensics.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key log entry. |
| `user_id` | `UUID` | Yes | None | FK -> `users.id`. Acting user. |
| `action` | `VARCHAR(100)` | No | None | Operation key (e.g., `AUTH_LOGIN`, `CLIENT_ADMIT`). |
| `table_name` | `VARCHAR(100)` | No | None | Mutated database table. |
| `record_id` | `TEXT` | No | None | Primary key of affected record. |
| `old_values` | `JSONB` | Yes | None | Whitelisted state before update. |
| `new_values` | `JSONB` | Yes | None | Whitelisted state after update. |
| `ip_address` | `VARCHAR(45)` | Yes | None | Caller IPv4 or IPv6 client address. |
| `user_agent` | `TEXT` | Yes | None | Caller HTTP User-Agent string. |
| `request_id` | `UUID` | Yes | None | Correlated HTTP Request ID. |
| `entity_state_id` | `INTEGER` | Yes | None | FK -> `states.id`. Affected state scope. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Audit log event timestamp. |

---

## 4. Reference Seed Data

```sql
-- 1. States
INSERT INTO states (id, code, name, slug, active) VALUES
(1, 'FL', 'Florida', 'florida', TRUE),
(2, 'IN', 'Indiana', 'indiana', TRUE),
(3, 'GA', 'Georgia', 'georgia', TRUE);

-- 2. System Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'super_admin', 'Global multi-state administrative authority'),
(2, 'administrator', 'State-scoped regional operational authority'),
(3, 'caregiver', 'Caregiver applicant and employed clinical provider'),
(4, 'client', 'Patient or legal family representative');

-- 3. Document Types
INSERT INTO document_types (id, name, for_role, requires_expiration, description) VALUES
(1, 'Driver''s License', 'caregiver', TRUE, 'Government-issued photo identification'),
(2, 'CPR Certificate', 'caregiver', TRUE, 'Cardiopulmonary Resuscitation accreditation'),
(3, 'CNA/HHA License', 'caregiver', TRUE, 'Certified Nursing Assistant / Home Health Aide state license'),
(4, 'TB Test Results', 'caregiver', TRUE, 'Tuberculosis screening assessment'),
(5, 'Physical Examination', 'caregiver', TRUE, 'Annual medical physical certification'),
(6, 'Level 2 Background Check', 'caregiver', FALSE, 'State and FBI fingerprint background clearance'),
(7, 'Auto Insurance', 'caregiver', TRUE, 'Proof of active vehicular insurance policy'),
(8, 'Direct Deposit Authorization', 'caregiver', FALSE, 'Payroll disbursement banking mandate'),
(9, 'Medicaid / Insurance Card', 'client', FALSE, 'Primary health insurance coverage card front and back'),
(10, 'Plan of Care (485 Form)', 'client', TRUE, 'Physician approved orders for home care services'),
(11, 'Prior Authorization Letter', 'client', TRUE, 'Official payer service authorization notice');

-- 4. Mandatory State Requirements Matrix
INSERT INTO document_requirements (state_id, document_type_id, for_role, required) VALUES
-- Florida Requirements
(1, 1, 'caregiver', TRUE), (1, 2, 'caregiver', TRUE), (1, 3, 'caregiver', TRUE),
(1, 4, 'caregiver', TRUE), (1, 6, 'caregiver', TRUE), (1, 9, 'client', TRUE), (1, 10, 'client', TRUE),
-- Indiana Requirements
(2, 1, 'caregiver', TRUE), (2, 2, 'caregiver', TRUE), (2, 4, 'caregiver', TRUE),
(2, 6, 'caregiver', TRUE), (2, 9, 'client', TRUE), (2, 10, 'client', TRUE),
-- Georgia Requirements
(3, 1, 'caregiver', TRUE), (3, 2, 'caregiver', TRUE), (3, 3, 'caregiver', TRUE),
(3, 4, 'caregiver', TRUE), (3, 6, 'caregiver', TRUE), (3, 9, 'client', TRUE), (3, 10, 'client', TRUE);
```
