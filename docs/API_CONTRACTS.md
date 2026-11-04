# API Contracts & Interface Specification — Caregiver Platform

> **Scope authority (2026-11-05):** [Scope of work.md](Scope%20of%20work.md) is the sole product requirements baseline. Read [AGENT_BUILD_GUIDE.md](AGENT_BUILD_GUIDE.md) before using this reference. Build basic functioning flows while agency processes remain pending. Technical examples and existing features below do not establish client approval, scope completion, or additional product requirements.

## Contract status and feature classification

This is a technical reference containing earlier examples; verify routes, serializers and consumers before changing behavior. Actual routes use trailing slashes. Example payloads, lifecycle enums and document metadata do not define an agency-approved process. Fix contracts coherently rather than imposing undocumented business fields on basic uploads.

| Sections | Relationship to scope |
|---|---|
| Authentication; public services/forms/licensing/contact; applications; intake/signatures; documents; training; administrator reviews and six reports | Support the requested flows; exact fields/defaults and review policy remain implementation choices or pending agency input |
| Public career board; caregiver assigned-client views; administrator analytics and user management | Supporting/existing features, not independently required by the Scope of Work |
| Client care-plan/schedule views | Explicitly required; staff editing/assignment routes are a possible basic data source, not authorization for a full clinical or staffing workflow |
| Authorizations | Upload, active/history/status views, staff monitoring and notifications are required; HCPCS, units-used calculations, billing burndown and weekly staffing caps are not prescribed |
| Legal hold, retention and restoration | Additional technical capabilities; do not implement or schedule purging solely because endpoints appear here |
| Document requirements | Support missing/expiry tracking; agency confirms which categories are mandatory and expire |

Reports require six real report views; exports are not specified. The compliance endpoint may support monitoring; it does not make automatic pre-assignment blocking a client requirement. Notification/email/SMS contracts still need to support all scope events even if this reference omits them. Secure agency messaging remains optional. No section here authorizes extra mandatory approval stages.

## 1. Global API Standards (Django REST Framework)

- **Framework**: Django REST Framework (DRF 3.18+) on Django 6.1+ (Python 3.14/3.12+).
- **Base URL**: `/api/v1`
- **Protocol**: HTTPS (TLS 1.3 enforced)
- **Content-Type**: `application/json` (or `multipart/form-data` for document uploads)
- **Authentication**: HTTP Bearer Header: `Authorization: Bearer <access_token>` via `rest_framework_simplejwt.authentication.JWTAuthentication`.
- **DRF HTTP Status Codes**:
  - `status.HTTP_200_OK`: Successful synchronous retrieval or state modification.
  - `status.HTTP_201_CREATED`: Resource successfully created.
  - `status.HTTP_204_NO_CONTENT`: Successful request with no response body.
  - `status.HTTP_400_BAD_REQUEST`: Serializer validation error or business logic constraint violation.
  - `status.HTTP_401_UNAUTHORIZED`: Missing, expired, or invalid Bearer JWT token.
  - `status.HTTP_403_FORBIDDEN`: User role or jurisdictional state boundary denies operation.
  - `status.HTTP_404_NOT_FOUND`: Target entity does not exist or was soft-deleted.

### 1.1 Standard DRF Pagination Contract

All paginated endpoints implement DRF's standard `PageNumberPagination`:

```json
{
  "count": 142,
  "next": "https://api.caregiverplatform.com/api/v1/admin/clients/?page=2",
  "previous": null,
  "results": [
    {
      "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "first_name": "Alice",
      "last_name": "Johnson",
      "state_id": 1,
      "status": "active"
    }
  ]
}
```

- Query Parameters:
  - `page`: Page number (integer, default `1`).
  - `page_size`: Records per page (integer, default `25`, max `100`).

### 1.2 Standard DRF Serializer Validation Error Contract (HTTP 400)

DRF returns structured field-keyed error payloads for validation failures:

```json
{
  "email": [
    "Enter a valid email address."
  ],
  "state_id": [
    "This field is required."
  ]
}
```

### 1.3 Standard Business & Boundary Error Contract (HTTP 403 / 404)

```json
{
  "detail": "You are not authorized to access records for this state.",
  "error_code": "FORBIDDEN_STATE_BOUNDARY"
}
```

---

## 2. Authentication Contracts (`/api/v1/auth`)

Authentication is powered by Django's native authentication (`django.contrib.auth`) and Simple JWT (`djangorestframework-simplejwt`):

### 2.1 `POST /api/v1/auth/token/`
- **Access**: Public
- **Description**: Authenticates user credentials via Django's authentication backend; returns SimpleJWT access and refresh tokens along with user claims.
- **Request Body (`TokenObtainPairSerializer`)**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Responses**:
  - `status.HTTP_200_OK`:
    ```json
    {
      "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
      "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
      "user_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "role": "caregiver",
      "state_id": 1
    }
    ```
  - `status.HTTP_401_UNAUTHORIZED`: `{"detail": "No active account found with the given credentials"}`

### 2.2 `POST /api/v1/auth/token/refresh/`
- **Access**: Public
- **Description**: Generates a new short-lived access token using a valid long-lived refresh token.
- **Request Body (`TokenRefreshSerializer`)**:
  ```json
  {
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  }
  ```
- **Responses**:
  - `status.HTTP_200_OK`:
    ```json
    {
      "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
    }
    ```
  - `status.HTTP_401_UNAUTHORIZED`: `{"detail": "Token is invalid or expired"}`

### 2.3 `POST /api/v1/auth/register/`
- **Access**: Public
- **Description**: Registers a new user account into the Django `users` table, hashing the password via Django's built-in hasher and binding initial role and state scope.
- **Request Body (`UserRegisterSerializer`)**:
  ```json
  {
    "email": "newuser@example.com",
    "password": "SecurePassword123!",
    "role": "caregiver",
    "state_id": 1
  }
  ```
- **Responses**:
  - `status.HTTP_201_CREATED`: Returns user profile record.
  - `status.HTTP_400_BAD_REQUEST`: Email already registered.

### 2.4 `POST /api/v1/auth/logout/`
- **Access**: Authenticated
- **Description**: Blacklists the supplied refresh token via `rest_framework_simplejwt.token_blacklist` and creates an audit log.
- **Request Body**:
  ```json
  {
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  }
  ```
- **Responses**:
  - `status.HTTP_200_OK`: `{"message": "Logged out successfully"}`

### 2.5 `GET /api/v1/auth/me/`
- **Access**: Authenticated (`IsAuthenticated`)
- **Description**: Resolves `request.user` via SimpleJWT and returns authoritative profile, role, and assigned jurisdictional state boundary.
- **Responses**:
  - `status.HTTP_200_OK`:
    ```json
    {
      "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "email": "nurse@example.com",
      "role": "caregiver",
      "state_id": 1,
      "status": "active"
    }
    ```

---

## 3. Public State Portals & Marketing (`/api/v1/states`)

*All endpoints in this group are Public (unauthenticated).*

### 3.1 `GET /api/v1/states/`
- **Description**: Lists all active operating jurisdictions.
- **Responses**:
  - `200 OK`:
    ```json
    [
      {"id": 1, "code": "FL", "name": "Florida", "slug": "florida", "active": true},
      {"id": 2, "code": "IN", "name": "Indiana", "slug": "indiana", "active": true},
      {"id": 3, "code": "GA", "name": "Georgia", "slug": "georgia", "active": true}
    ]
    ```

### 3.2 `GET /api/v1/states/{state}`
- **Path Params**: `state` (slug: `florida`, `indiana`, `georgia`)
- **Description**: Returns CMS overview content for the state landing page.

### 3.3 `GET /api/v1/states/{state}/services`
- **Description**: Returns state-specific service offerings (Personal Care, Companion Care).

### 3.4 `GET /api/v1/states/{state}/forms`
- **Description**: Public downloadable forms and documents for the state.

### 3.5 `GET /api/v1/states/{state}/licensing`
- **Description**: State regulatory licensing declarations and disclosures.

### 3.6 `GET /api/v1/states/{state}/careers`
- **Description**: Active caregiver career listings in the state.

### 3.7 `POST /api/v1/states/{state}/contact`
- **Description**: Ingests public lead inquiry into `client_referrals` table.
- **Request Body**:
  ```json
  {
    "first_name": "Mary",
    "last_name": "Smith",
    "phone": "305-555-0199",
    "email": "mary.smith@example.com",
    "referral_source": "Website",
    "notes": "Inquiry regarding home health aide for elderly mother."
  }
  ```
- **Responses**:
  - `201 Created`: `{"referral_id": "uuid...", "status": "new"}`

---

## 4. Caregiver Portal (`/api/v1/caregivers`)

### 4.1 `POST /api/v1/caregivers/apply-public`
- **Access**: Public
- **Description**: Atomic applicant onboarding. Creates user credentials, caregiver profile, and application record in a single database transaction.
- **Request Body**:
  ```json
  {
    "email": "applicant@example.com",
    "password": "StrongPassword123!",
    "state_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "phone": "407-555-0144",
    "date_of_birth": "1990-05-15",
    "ssn_last4": "5678",
    "signature_data": "data:image/png;base64,iVBORw0KGgo...",
    "signed_name": "John Doe"
  }
  ```
- **Responses**:
  - `201 Created`: `{"application_id": "uuid...", "status": "submitted"}`

### 4.2 `GET /api/v1/caregivers/me`
- **Access**: `caregiver`
- **Description**: Returns demographic profile for authenticated caregiver.

### 4.3 `PATCH /api/v1/caregivers/me/profile`
- **Access**: `caregiver`
- **Request Body**: `{"phone": "407-555-9999", "address": "123 Palm Way, Orlando, FL"}`

### 4.4 `GET /api/v1/caregivers/me/application`
- **Access**: `caregiver`
- **Description**: Status of current application (`submitted`, `under_review`, `approved`, `rejected`).

### 4.5 `POST /api/v1/caregivers/applications/resubmit`
- **Access**: `caregiver`
- **Description**: Resubmits a previously rejected application with corrected profile data and fresh e-signature.

### 4.6 `GET /api/v1/caregivers/me/credential-status`
- **Access**: `caregiver`
- **Description**: Evaluates uploaded documents against mandatory state requirements matrix.
- **Responses**:
  - `200 OK`:
    ```json
    {
      "compliant": false,
      "missing_requirements": ["CPR Certificate"],
      "expiring_soon": [],
      "expired": [],
      "approved": ["Driver's License"]
    }
    ```

### 4.7 `GET /api/v1/caregivers/me/clients`
- **Access**: `caregiver`
- **Description**: Lists clients assigned via `caregiver_client_assignments`.

### 4.8 `GET /api/v1/caregivers/me/clients/{client_id}/care-plan`
- **Access**: `caregiver` (Assigned only)
- **Description**: Read-only clinical care directives and ADLs for assigned client.

### 4.9 `GET /api/v1/caregivers/me/clients/{client_id}/schedule`
- **Access**: `caregiver` (Assigned only)
- **Description**: Weekly scheduled shift blocks for assigned client.

---

## 5. Client Portal (`/api/v1/clients`)

### 5.1 `GET /api/v1/clients/me`
- **Access**: `client`
- **Description**: Returns clinical demographics, Medicaid number, and admission status.

### 5.2 `POST /api/v1/clients/intake`
- **Access**: `client`
- **Description**: Submits digital intake packet and consent signature.
- **Request Body**:
  ```json
  {
    "first_name": "Alice",
    "last_name": "Johnson",
    "date_of_birth": "1948-11-20",
    "phone": "404-555-0188",
    "address": "456 Peachtree Rd, Atlanta, GA",
    "medicaid_number": "GA-987654321",
    "signature_data": "data:image/png;base64,...",
    "signed_name": "Alice Johnson"
  }
  ```

### 5.3 `GET /api/v1/clients/me/agreements`
- **Access**: `client`
- **Description**: Lists statutory agreements required for signing (`Care Agreement`, `HIPAA Disclosure`, `Client Rights`).

### 5.4 `POST /api/v1/clients/me/agreements/{key}/sign`
- **Access**: `client`
- **Description**: Submits signature for a legal agreement; generates SHA-256 hash.
- **Request Body**:
  ```json
  {
    "signature_data": "data:image/png;base64,...",
    "signed_name": "Alice Johnson"
  }
  ```

### 5.5 `GET /api/v1/clients/me/authorizations`
- **Access**: `client`
- **Description**: Prior authorizations on file for the client.

### 5.6 `POST /api/v1/clients/me/authorizations`
- **Access**: `client`
- **Description**: Client self-service upload of insurance authorization approval letters.

### 5.7 `GET /api/v1/clients/me/care-plan`
- **Access**: `client`
- **Description**: Active clinical care plan, primary nurse, and daily activities.

### 5.8 `GET /api/v1/clients/me/schedule`
- **Access**: `client`
- **Description**: Weekly recurring caregiver shift visits.

---

## 6. Document Management & Media Storage (`/api/v1/documents`)

### 6.1 `GET /api/v1/documents/types`
- **Access**: Authenticated
- **Description**: Returns standard document types (`document_types`).

### 6.2 `POST /api/v1/documents/upload-intent`
- **Access**: Authenticated
- **Description**: Pre-allocates a document record and generates an HMAC-signed upload URL (or S3 presigned PUT URL when S3 is active) with 15-minute TTL.
- **Request Body**:
  ```json
  {
    "document_type_id": 2,
    "filename": "cpr_certificate.pdf",
    "content_type": "application/pdf",
    "expiration_date": "2027-10-01"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "document_id": "a5d89f81-8b2b-42c2-9e9d-7f5be37b01d3",
      "upload_url": "/api/v1/documents/a5d89f81-8b2b-42c2-9e9d-7f5be37b01d3/upload-file/?token=a5d89f81...:1s...",
      "expires_in_seconds": 900
    }
    ```

### 6.2b `PUT /api/v1/documents/{id}/upload-file/`
- **Access**: Public with valid `?token=` parameter OR Authenticated Owner / Scoped Admin
- **Description**: Receives the raw binary stream (or multipart/form-data) and stores it in Django media storage (`MEDIA_ROOT`).
- **Responses**:
  - `200 OK`:
    ```json
    {
      "message": "File uploaded successfully to media storage.",
      "document_id": "a5d89f81-8b2b-42c2-9e9d-7f5be37b01d3",
      "storage_path": "documents/FL/user-id/a5d89f81_cpr_certificate.pdf",
      "file_url": "/media/documents/FL/user-id/a5d89f81_cpr_certificate.pdf"
    }
    ```

### 6.3 `GET /api/v1/documents/{id}/download-url`
- **Access**: Authenticated (Owner or Scoped Admin)
- **Description**: Generates an HMAC-signed download URL (or S3 Presigned GET URL) with 15-minute TTL.
- **Responses**:
  - `200 OK`:
    ```json
    {
      "download_url": "/api/v1/documents/a5d89f81-8b2b-42c2-9e9d-7f5be37b01d3/file/?token=a5d89f81...:1s...",
      "expires_in_seconds": 900
    }
    ```

### 6.3b `GET /api/v1/documents/{id}/file/`
- **Access**: Public with valid `?token=` parameter OR Authenticated Owner / Scoped Admin
- **Description**: Streams the stored binary document file inline via `FileResponse` with appropriate MIME content-type headers.

---

## 7. Training & In-Service Certifications (`/api/v1/training`)

### 7.1 `GET /api/v1/training/courses`
- **Access**: Authenticated
- **Description**: Lists active continuing education courses.

### 7.2 `GET /api/v1/training/my-enrollments`
- **Access**: `caregiver`
- **Description**: Returns user's course progress, status, and deadlines.

### 7.3 `POST /api/v1/training/courses/{id}/enroll`
- **Access**: `caregiver`
- **Description**: Enrolls caregiver in training module.

### 7.4 `POST /api/v1/training/courses/{id}/complete`
- **Access**: `caregiver`
- **Description**: Finalizes module completion; records `completed_at = NOW()`.

### 7.5 `GET /api/v1/training/courses/{id}/certificate`
- **Access**: `caregiver`
- **Description**: Returns dynamic binary PDF Certificate of Completion (`Content-Type: application/pdf`).

---

## 8. Administrator Portal (`/api/v1/admin`)

*All routes require role `administrator` or `super_admin`.*
*`administrator` access is strictly scoped to records within their assigned `state_id`.*

### 8.1 Dashboard & Analytics
- `GET /api/v1/admin/dashboard`: Real-time state metrics (active counts, pending triage, expiring counts).
- `GET /api/v1/admin/reports`: Exportable regulatory summary metrics.

### 8.2 Caregiver Management
- `GET /api/v1/admin/caregivers`: Paginated caregiver roster with state scoping.
- `GET /api/v1/admin/caregivers/analytics`: Application funnel conversion counts.
- `GET /api/v1/admin/caregivers/{application_id}`: Full application inspection.
- `POST /api/v1/admin/caregivers/{application_id}/review`:
  - **Request Body**:
    ```json
    {
      "status": "approved", // or "rejected"
      "notes": "Verified CPR and Level 2 background clearance.",
      "rejection_reason": null
    }
    ```
- `GET /api/v1/admin/caregivers/{caregiver_id}/compliance`: Validates credentials before client assignment.
- `GET /api/v1/admin/caregivers/{caregiver_id}/assignments`: Active clients assigned to this aide.

### 8.3 Client Admission & Care Operations
- `GET /api/v1/admin/clients`: Paginated list of clients in state.
- `GET /api/v1/admin/clients/{client_id}`: Full clinical profile and agreements status.
- `POST /api/v1/admin/clients/{client_id}/admission`:
  - **Request Body**:
    ```json
    {
      "status": "approved", // or "active", "rejected"
      "service_start_date": "2026-11-01",
      "admission_notes": "Client admitted under Medicaid waiver."
    }
    ```
- `PUT /api/v1/admin/clients/{client_id}/care-plan`: Creates or replaces clinical directives and ADLs.
- `POST /api/v1/admin/clients/{client_id}/schedule`: Creates weekly recurring shift block.
- `DELETE /api/v1/admin/clients/{client_id}/schedule/{schedule_id}`: Soft-deletes a shift block.
- `POST /api/v1/admin/clients/{client_id}/assignments`:
  - Connects caregiver to client. Enforces pre-assignment compliance gate.
  - **Request Body**:
    ```json
    {
      "caregiver_id": "uuid...",
      "role": "primary"
    }
    ```
- `DELETE /api/v1/admin/clients/{client_id}/assignments/{caregiver_id}`: Terminates staffing assignment.

### 8.4 Authorizations & Billing Burndown
- `GET /api/v1/admin/authorizations`: Paginated prior authorizations with filter by status.
- `POST /api/v1/admin/authorizations`:
  - **Request Body**:
    ```json
    {
      "client_id": "uuid...",
      "authorization_number": "AUTH-2026-991",
      "hcpcs_code": "T1019",
      "service_description": "Personal Care Services",
      "unit_type": "15_min",
      "total_units_authorized": 480,
      "max_weekly_hours": 30.0,
      "start_date": "2026-10-01",
      "end_date": "2027-03-31"
    }
    ```
- `PATCH /api/v1/admin/authorizations/{id}`: Updates units used or details.

### 8.5 Referrals Pipeline
- `GET /api/v1/admin/referrals`: Inbound leads pipeline.
- `PATCH /api/v1/admin/referrals/{referral_id}`: Updates lead status or converts directly to admitted client.

### 8.6 Document Compliance Review
- `GET /api/v1/admin/documents`: Document review queue.
- `POST /api/v1/admin/documents/{document_id}/review`: Approve or reject with recorded rationale.
- `GET /api/v1/admin/settings/document-requirements`: State requirements matrix.
- `PUT /api/v1/admin/settings/document-requirements`: Updates required documents per jurisdiction.

### 8.7 Legal Hold, Retention & Restoration
- `PATCH /api/v1/admin/clients/{client_id}/legal-hold`: Toggles `legal_hold` protection flag.
- `PATCH /api/v1/admin/caregivers/{caregiver_id}/legal-hold`: Toggles `legal_hold` flag.
- `PATCH /api/v1/admin/documents/{document_id}/legal-hold`: Toggles `legal_hold` flag.
- `POST /api/v1/admin/{resource}/{id}/restore`: Restores soft-deleted entity (`deleted_at = NULL`).

### 8.8 Audit Logs & User Administration
- `GET /api/v1/admin/audit-logs`: Inspects append-only system audit trail with IP and user diffs.
- `GET /api/v1/admin/users`: List user accounts.
- `POST /api/v1/admin/users/{user_id}/status`: Change account status (`active`, `suspended`).
- `POST /api/v1/admin/users/{user_id}/role`: Change role tier (Super Admin only).
- `POST /api/v1/admin/users/{user_id}/state`: Reassign administrator to different state (Super Admin only).
- `DELETE /api/v1/admin/users/{user_id}`: Soft-delete user account.
