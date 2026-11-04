# Security Requirements & HIPAA Compliance Specification — Caregiver Platform

## 1. Executive Summary & Security Objectives

The **Caregiver Platform** processes and stores **Electronic Protected Health Information (ePHI)** and Personally Identifiable Information (PII) across Florida, Indiana, and Georgia.
This document specifies the technical safeguards, cryptographic standards, multi-tenant boundaries, and compliance policies required to satisfy the **Health Insurance Portability and Accountability Act (HIPAA) Security Rule (45 CFR Part 164, Subpart C)** on modern cloud infrastructure, completely independent of proprietary BaaS solutions.

---

## 2. HIPAA Security Rule Technical Safeguards (45 CFR § 164.312)

```
HIPAA Technical Safeguards Architecture
├── § 164.312(a)(1) Access Control
│   ├── Unique User Identification (UUIDs, no shared credentials)
│   ├── Multi-Tenant State Isolation (State as Authorization Boundary)
│   ├── Role-Based Access Control (RBAC: 4 strict tiers)
│   └── Automatic Session Expiration (60-minute JWT token lifetime)
├── § 164.312(b) Audit Controls
│   ├── Append-Only audit_logs Table
│   ├── Whitelisted Diff Tracking (No plaintext passwords or full PHI blobs)
│   └── Context Capture (User ID, IP, User-Agent, Request ID, State ID)
├── § 164.312(c)(1) Integrity Controls
│   ├── Cryptographic SHA-256 Content Hashing on Agreements & Applications
│   └── Non-Repudiation Electronic Signature Verification
├── § 164.312(d) Transmission Security
│   ├── TLS 1.3 Enforced In-Transit (HTTPS only, HSTS)
│   └── S3 Presigned URLs with 15-Minute Expiration Windows
└── § 164.312(e) Storage & At-Rest Encryption
    ├── PostgreSQL Database Encrypted via AES-256 / AWS KMS
    └── S3 Private Storage Buckets with SSE-KMS Server-Side Encryption
```

---

## 3. Authentication & Credential Architecture

### 3.1 Password Hashing Specification
User passwords must never be stored in plaintext or with deprecated algorithms (MD5, SHA-1, standard SHA-256).
- **Algorithm**: **Argon2id** (RFC 9106), the memory-hard winner of the Password Hashing Competition and OWASP primary recommendation.
- **Parameters**:
  - Memory cost ($m$): $65536 \text{ KiB}$ ($64 \text{ MB}$)
  - Time iterations ($t$): $3$
  - Parallelism ($p$): $4$ threads
  - Salt: Cryptographically random 16 bytes generated per password.
- **Fallback**: bcrypt with work factor $12$ where Argon2id hardware instructions are unavailable.
- **Storage Target**: Stored in `users.password_hash VARCHAR(255)`.

### 3.2 Authentication Architecture: Django Built-in Auth & SimpleJWT

Authentication is self-hosted natively using Django's built-in authentication framework (`django.contrib.auth`) paired with `djangorestframework-simplejwt`:

#### Identity & Credential Management:
- **User Engine**: Django custom User model (`AbstractBaseUser`, `PermissionsMixin`) mapped to `users`.
- **Password Hashing**: Evaluated and hashed via Django's password hasher pipeline (`django.contrib.auth.hashers.make_password`), utilizing **Argon2id** (`Argon2PasswordHasher`) or PBKDF2 (`PBKDF2PasswordHasher`).

#### Token Lifecycle (`djangorestframework-simplejwt`):
- **Token Issuer**: DRF `/api/v1/auth/token/` (`TokenObtainPairView`).
- **Signature Algorithm**: HMAC-SHA256 (`HS256`) signed with Django `SECRET_KEY` / `SIMPLE_JWT['SIGNING_KEY']`.
- **Token Lifetimes**:
  - **Access Token**: Maximum **60 minutes** (`exp = now() + 3600`).
  - **Refresh Token**: Maximum **7 days** with token rotation (`ROTATE_REFRESH_TOKENS = True`) and blacklisting (`BLACKLIST_AFTER_ROTATION = True`).
- **Mandatory Claims**:
  - `sub`: User UUID matching `users.id`.
  - `token_type`: Claim declaring `"access"` or `"refresh"`.
  - `exp`: Expiration epoch timestamp validated locally.
  - `jti`: Unique token identifier preventing replay attacks.
- **Anti-Spoofing Rule**: Client-supplied claims are never trusted for authorization. The SimpleJWT authenticator resolves `sub` directly to `request.user` from the PostgreSQL `users` table to determine authoritative `role_id`, `state_id`, and `status`.

#### 3.3 DRF Security & Authentication Pipeline
1. `JWTAuthentication` (`rest_framework_simplejwt.authentication.JWTAuthentication`) extracts the Bearer token from the `Authorization: Bearer <token>` header.
2. Validates the cryptographic signature and expiration horizon locally in `< 1 ms`.
3. Resolves the database `User` instance and attaches it to `request.user`.
4. Validates that `request.user.status == 'active'` and `request.user.deleted_at IS NULL`.
5. DRF Permission Classes (`IsAuthenticated`, `IsStateScopedAdmin`) inspect `request.user` and enforce RBAC and jurisdictional state boundaries, aborting with `HTTP 403 Forbidden` on violations.

---

## 4. Multi-Tenant Authorization & State Scoping

### 4.1 Tenancy Core Tenet
> **Never trust client-supplied user, role, or state identifiers.**
A user's operational boundaries are determined exclusively by the authenticated session context.

### 4.2 Role-Based Access Control (RBAC) Matrix

| Resource / Endpoint Domain | `super_admin` | `administrator` | `caregiver` | `client` | `public` |
|---|---|---|---|---|---|
| **Public State CMS & Forms** | Full | Read-Only | Read-Only | Read-Only | Read-Only |
| **Caregiver Public Apply** | - | - | - | - | Create |
| **Caregiver Own Profile & Docs** | Full | Scoped State | Self (Own) | Denied | Denied |
| **Caregiver Application Review**| Full | Scoped State | Denied | Denied | Denied |
| **Client Intake & Agreements** | Full | Scoped State | Denied | Self (Own) | Denied |
| **Client Admission Lifecycle** | Full | Scoped State | Denied | Denied | Denied |
| **Prior Authorizations** | Full | Scoped State | Denied | Self (Own) | Denied |
| **Care Plans & Scheduling** | Full | Scoped State | Assigned Clients | Self (Own) | Denied |
| **Audit Logs Inspection** | Full | Scoped State | Denied | Denied | Denied |
| **Admin User Administration** | Full | Denied | Denied | Denied | Denied |

### 4.3 State Scoping Logic & Fail-Closed Rules

1. **State Administrator Scope**:
   - An administrator assigned to Florida (`state_id = 1`) receives:
     $$\text{AdminScope}(\text{states} = [1], \text{is\_super} = \text{False})$$
   - All queries automatically inject `WHERE state_id IN (1)` prior to database execution.
2. **Fail-Closed on Unassigned Administrator**:
   - If an administrator row contains `state_id IS NULL`, `require_admin_scoped` fails closed:
     ```json
     HTTP 403 Forbidden: {"detail": "Administrator is not assigned to a state"}
     ```
3. **Cross-State Injection Defense**:
   - If a Florida admin requests `GET /api/v1/admin/clients/{id}` where `{id}` belongs to Georgia (`state_id = 3`), `assert_state_allowed` halts execution:
     ```json
     HTTP 403 Forbidden: {"detail": "You are not authorized to access records for this state"}
     ```
4. **URL Filter Enforcement**:
   - If an admin passes `?state_id=2` while scoped to `1`, `assert_permitted_filter` rejects the request with HTTP 403 rather than silently returning empty rows, ensuring unauthorized exploration is caught and logged.

---

## 5. Audit Logging & Non-Repudiation Architecture

### 5.1 Append-Only Audit Logging (`audit_logs`)
Every state-changing operation and PHI access event produces an immutable audit record:
- **Columns**: `id`, `user_id`, `action`, `table_name`, `record_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `request_id`, `entity_state_id`, `created_at`.
- **Database Immutability**: No `UPDATE` or `DELETE` grants exist on `audit_logs` for any application user.
- **Field Whitelisting Standard**:
  - Never audit raw passwords, tokens, or multi-megabyte binary signature blobs.
  - Whitelist audited fields:
    ```python
    AUDIT_WHITELIST = {
        "clients": ["status", "service_start_date", "admitted_by", "rejection_reason"],
        "caregivers": ["first_name", "last_name", "phone", "state_id"],
        "authorizations": ["units_used", "status", "end_date", "total_units_authorized"],
        "users": ["status", "role_id", "state_id"]
    }
    ```

### 5.2 Cryptographic Integrity & E-Signatures
To guarantee legal non-repudiation for Caregiver Applications and Client Legal Agreements (`client_agreements`):
1. The backend serializes the signed payload into canonical, sorted JSON.
2. Computes the cryptographic SHA-256 digest:
   $$\text{content\_hash} = \text{SHA-256}(\text{Canonical Payload} \parallel \text{signed\_name} \parallel \text{signed\_at})$$
3. Stores `content_hash` alongside the Base64 signature stroke data.
4. Any retroactive modification to terms or client declarations invalidates the hash.

---

## 6. Document Storage & Media Security Architecture

1. **Storage Engine & Media Root**:
   - Primary operations utilize Django's built-in media storage (`MEDIA_ROOT`), served through DRF streaming endpoints and reverse-proxied via Vite (`/media`).
   - Cloud S3 deployment is supported via optional `USE_S3=true` with private buckets and server-side encryption (SSE-KMS / AES-256).
2. **Cryptographic HMAC Signed URLs**:
   - Clients never access storage without verification.
   - Upload and download URLs use time-stamped HMAC-SHA256 signatures generated via `django.core.signing.TimestampSigner` with a maximum Time-To-Live (TTL) of **15 minutes (900 seconds)**.
   - Endpoints verify cryptographic signature validity before permitting binary file writes or reads.
3. **Role & Jurisdictional Scoping**:
   - URLs and direct streams are accessible only to the document owner, active administrators within the matching state jurisdiction, or super administrators.
4. **Isolated Key Path Hierarchy**:
   - Documents are stored in structured, multi-tenant segmented paths:
     $$\text{documents}/\{\text{state\_code}\}/\{\text{owner\_uuid}\}/\{\text{doc\_id}\}\_\{\text{filename}\}$$

---

## 7. Data Retention, Legal Hold & Soft-Deletion

1. **Soft Deletion Enforced**:
   - Deletions in operational tables set `deleted_at = NOW()` and `deleted_by = user_id`.
   - Records remain hidden from all normal queries using `WHERE deleted_at IS NULL`.
2. **HIPAA 7-Year Retention Horizon**:
   - Clinical and operational healthcare records are retained for a minimum of 7 years in accordance with state and federal healthcare statutes.
3. **Legal Hold Immunity**:
   - Records marked with `legal_hold = TRUE` cannot be purged or destroyed by automated retention purge jobs under any circumstances.
4. **Administrative Restoration**:
   - Authorized administrators can reverse accidental soft deletions via `POST /api/v1/admin/{resource}/{id}/restore`, resetting `deleted_at` and `deleted_by` to `NULL`.

---

## 8. Network & Infrastructure Hardening

| Layer | Security Control | Implementation |
|---|---|---|
| **Network** | **TLS 1.3 Encryption** | Enforced at Load Balancer / Reverse Proxy. Weak ciphers disabled. |
| | **HSTS Headers** | `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` |
| | **CORS Policy** | Explicit origin whitelist matching verified frontend domains; wildcards forbidden. |
| | **Rate Limiting** | Rate limiting on authentication routes (maximum 5 failed login attempts per IP per 15 minutes). |
| **Application** | **Parameterized SQL** | All database queries executed through Django ORM parameterized queries; zero raw string interpolation. |
| | **Content Security Policy**| Modern CSP preventing XSS injection: `default-src 'self'`. |
| | **Request ID Tracking** | Every request assigned a unique `X-Request-ID` propagated through logging and audit logs. |
| **Database** | **Encrypted Storage** | Storage volumes encrypted using AES-256 via AWS KMS. |
| | **Least Privilege User** | Application connects via a dedicated PostgreSQL user with restricted grants (no superuser access). |
