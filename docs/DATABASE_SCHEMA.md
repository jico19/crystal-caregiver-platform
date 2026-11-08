# Database Schema

This is the implemented database foundation for the root Scope of Work, not
evidence that portal features or agency processes are complete. Django models
and migrations in `backend/apps/operations/` are the technical source of truth.
The existing `accounts.User` model and its primary key are preserved.

## Structure and ownership

One logical agency has FL/IN/GA branches. Caregiver and client records are
separate per branch; a login may link to multiple records. A nullable user link
supports unclaimed applications and intakes. Never claim a record merely by
matching email. Active state administrators may have one branch assignment;
cross-state agency administration requires an explicit AgencyAdmin record.

Models are grouped into identity, website, intake, documents, forms, training,
care, and notifications modules under one app to keep migrations and cross-domain
foreign keys straightforward. Split Django apps only if independent ownership
or deployment needs justify it later.

All new records have bigint internal keys, unique UUID public identifiers, and
creation/update timestamps. Historical records still include the update column
but database triggers prohibit edits. Branch-owned records carry an explicit
branch FK and a unique `(branch_id, id)` pair.

## Integrity and evidence

- All business FKs use PROTECT. There is no automatic retention/purge policy.
- Migration 0002 installs PostgreSQL composite FKs and relationship triggers.
  SQLite uses relationship triggers for the same branch boundary. Parent branch
  reassignment is prohibited; changing a public selector cannot move records.
- Database checks enforce exactly one document/signature subject, positive
  versions and file sizes, valid dates/durations, valid review decisions,
  bounded training progress, and unique version/delivery/assignment identities.
- Review, signature, delivery-attempt, audit, certificate, care-plan, form-version,
  and course-version rows are append-only. Create corrections as new evidence.
- Uploaded file contents/metadata and document-version evidence cannot be
  replaced. Document review status remains editable for a future audited review
  service. Expiration is a date-derived view, not a review status.
- Submitted application/intake payloads and form versions cannot be overwritten.
  Draft answers may change. Signature requests retain their rendered document,
  owner, submission, form version, and requested signer.
- Subject checks prevent another client's evidence from being attached to an
  authorization/care plan and require signature events to name the requested
  signer. Certificates require completed training with 100% recorded progress;
  this is progress integrity, not a quiz score or agency-approved completion rule.
- File bytes live outside the database in private storage. SHA-256 and storage
  keys are metadata only; upload validation, malware scanning, authenticated
  retrieval, and actual signature verification remain unimplemented.
- Document categories are seeded from the Scope of Work; neither branches nor
  mandatory requirements nor reminder schedules are inferred. Auto Insurance
  and Driver's Insurance remain separate categories.

## Services and permissions still required

No new public APIs, account-linking flows, UI, scheduler, provider integration,
or report execution is added by these migrations. FKs validate relationships;
they do not authorize the user performing a write or read. Future services must
enforce staff roles, record ownership, branch access, and permitted transitions.
Database access must remain restricted to trusted application/operators.

Implement review/status changes and notification intents atomically. Derive
accepted evidence from approved document versions, keeping an earlier approved
version valid while a replacement awaits review. Query approval/expiration and
training due dates rather than persisting contradictory dashboard flags.

Publication, workflow, and delivery status strings remain provisional rather
than approved agency state machines. The database constrains document decisions,
staff roles, supported states, and email/SMS channels; future domain APIs must
enumerate all other allowed statuses before exposing writes.

Notifications deduplicate logical events; deliveries are unique per channel,
and attempts are numbered and immutable. Delivery defaults to simulation.
Schema-level deduplication does not itself implement provider idempotency,
retries, automatic reminders, consent handling, or successful live delivery.

## Required reports

| Scope report | Source records |
|---|---|
| Caregiver compliance | Caregiver, BranchDocumentRequirement, Document, DocumentVersion |
| Expiring credential | Approved DocumentVersion and expiration dates |
| In-service completion | TrainingAssignment, TrainingCourseVersion, TrainingCertificate |
| Client authorization | ClientAuthorization, AuthorizationEvent |
| Referral source | ClientReferral and source snapshot/catalog |
| Website inquiry | WebsiteInquiry and branch/date/status |

No report snapshot or export tables are introduced. Report definitions and
agency approval remain pending; indexes support common branch/date/status queries.

## Verification and rollout

Apply with `backend/venv/Scripts/python.exe backend/manage.py migrate`.
From `backend/`, run `venv/Scripts/python.exe -m pytest apps/operations/tests.py
apps/core/tests.py` and `venv/Scripts/python.exe manage.py makemigrations --check
--dry-run`. Use `--create-db` when verifying changed local migration guards.

Tests cover direct database writes, cross-state relationships, append-only
history, per-state account records, owner checks, dates, training, and delivery
deduplication. Local verification uses SQLite. PostgreSQL migrations and tests
require a separate PostgreSQL integration run before deployment; no local
PostgreSQL server or container runtime has been established by this task.

Implementation verification: 67 focused backend tests passed on a fresh SQLite
test database; system checks, pending-migration checks, and model/migration
consistency passed. The existing console-email deprecation warning remains.

This work supports Scope sections 1–6 at the persistence layer. Agency process
confirmation, forms, training content, reminder policies, legal/state structure,
delegated client access, providers, security review, and deployment evidence
remain separate. Only synthetic data is allowed at this stage. Secure messaging
is deferred; no billing, clinical rules, quiz thresholds, or staffing automation
is added. Existing user authentication and the health endpoint are preserved.

## Model field reference

The following inventory lists implemented fields (not API response contracts).

<!-- inventory -->

| Model / SQL table | Business fields (FK targets in parentheses) |
|---|---|
| Agency / `operations_agency` | name (CharField) |
| AgencyAdmin / `operations_agencyadmin` | agency (Agency); user (User); active (BooleanField) |
| Announcement / `operations_announcement` | branch (StateBranch); audience (CharField); title (CharField); body (TextField); published_at? (DateTimeField); expires_at? (DateTimeField); author (User) |
| ApplicationReview / `operations_applicationreview` | branch (StateBranch); previous_status (CharField); new_status (CharField); reviewer (User); comment (TextField); reviewed_at (DateTimeField); application (CaregiverApplication) |
| AuditEvent / `operations_auditevent` | branch? (StateBranch); actor? (User); action (CharField); resource_type (CharField); resource_id (UUIDField); occurred_at (DateTimeField); safe_metadata (JSONField) |
| AuthorizationDocument / `operations_authorizationdocument` | branch (StateBranch); authorization (ClientAuthorization); document_version (DocumentVersion) |
| AuthorizationEvent / `operations_authorizationevent` | branch (StateBranch); authorization (ClientAuthorization); actor (User); previous_status (CharField); new_status (CharField); comment (TextField); occurred_at (DateTimeField) |
| BranchContent / `operations_branchcontent` | branch (StateBranch); content_key (SlugField); title (CharField); body (TextField); publication_status (CharField) |
| BranchDocumentRequirement / `operations_branchdocumentrequirement` | branch (StateBranch); document_type (DocumentType); required (BooleanField); tracks_expiration (BooleanField); active (BooleanField) |
| BranchStaff / `operations_branchstaff` | branch (StateBranch); user (User); role (CharField); active (BooleanField) |
| CarePlan / `operations_careplan` | branch (StateBranch); client (Client); version_number (PositiveIntegerField); summary (TextField); document_version? (DocumentVersion); effective_from? (DateField); effective_until? (DateField); recorded_by (User) |
| Caregiver / `operations_caregiver` | branch (StateBranch); user? (User); name (CharField); email (CharField); phone (CharField); active (BooleanField); onboarding_status (CharField) |
| CaregiverApplication / `operations_caregiverapplication` | branch (StateBranch); caregiver (Caregiver); form_version (FormVersion); submitted_answers (JSONField); status (CharField); submitted_at? (DateTimeField) |
| Client / `operations_client` | branch (StateBranch); user? (User); name (CharField); email (CharField); phone (CharField); active (BooleanField); admission_status (CharField); service_start_date? (DateField) |
| ClientAuthorization / `operations_clientauthorization` | branch (StateBranch); client (Client); reference (CharField); issuer_name (CharField); status (CharField); valid_from? (DateField); valid_until? (DateField); supersedes? (ClientAuthorization) |
| ClientIntake / `operations_clientintake` | branch (StateBranch); client (Client); referral? (ClientReferral); form_version (FormVersion); submitted_answers (JSONField); status (CharField); submitted_at? (DateTimeField) |
| ClientReferral / `operations_clientreferral` | branch (StateBranch); client (Client); source? (ReferralSource); source_name_snapshot (CharField); referrer_contact (CharField); received_at (DateTimeField); status (CharField) |
| DeliveryAttempt / `operations_deliveryattempt` | branch (StateBranch); delivery (NotificationDelivery); attempt_number (PositiveIntegerField); attempted_at (DateTimeField); outcome (CharField); safe_error_code (CharField) |
| Document / `operations_document` | branch (StateBranch); document_type (DocumentType); caregiver? (Caregiver); client? (Client) |
| DocumentReview / `operations_documentreview` | branch (StateBranch); document_version (DocumentVersion); reviewer (User); decision (CharField); comment (TextField); reviewed_at (DateTimeField) |
| DocumentType / `operations_documenttype` | code (SlugField); label (CharField); audience (CharField); active (BooleanField) |
| DocumentVersion / `operations_documentversion` | branch (StateBranch); document (Document); version_number (PositiveIntegerField); file (StoredFile); issued_on? (DateField); expires_on? (DateField); submitted_at (DateTimeField); review_status (CharField) |
| FormTemplate / `operations_formtemplate` | branch (StateBranch); audience (CharField); kind (CharField); title (CharField); active (BooleanField) |
| FormVersion / `operations_formversion` | branch (StateBranch); template (FormTemplate); version_number (PositiveIntegerField); field_schema (JSONField); instruction_text (TextField); consent_text (TextField); packet_file? (StoredFile); published_at? (DateTimeField) |
| IntakeReview / `operations_intakereview` | branch (StateBranch); previous_status (CharField); new_status (CharField); reviewer (User); comment (TextField); reviewed_at (DateTimeField); intake (ClientIntake) |
| Notification / `operations_notification` | branch (StateBranch); recipient_user? (User); caregiver? (Caregiver); client? (Client); event_type (CharField); subject_reference (UUIDField); deduplication_key (CharField); safe_content (TextField); read_at? (DateTimeField) |
| NotificationDelivery / `operations_notificationdelivery` | branch (StateBranch); notification (Notification); channel (CharField); recipient_snapshot (CharField); scheduled_at? (DateTimeField); status (CharField); simulated (BooleanField); provider_reference (CharField) |
| ReferralSource / `operations_referralsource` | branch (StateBranch); name (CharField); source_type (CharField); active (BooleanField) |
| ReminderRule / `operations_reminderrule` | branch (StateBranch); event_type (CharField); channel (CharField); lead_days? (PositiveIntegerField); enabled (BooleanField) |
| ServiceScheduleEntry / `operations_servicescheduleentry` | branch (StateBranch); client (Client); starts_at (DateTimeField); ends_at (DateTimeField); timezone (CharField); service_label (CharField); status (CharField); recorded_by (User) |
| SignatureEvent / `operations_signatureevent` | branch (StateBranch); request (SignatureRequest); signer (User); signer_name_snapshot (CharField); consent_text_snapshot (TextField); signed_at (DateTimeField); signed_file (StoredFile); document_hash (CharField); provider_reference (CharField) |
| SignatureRequest / `operations_signaturerequest` | branch (StateBranch); form_version (FormVersion); caregiver? (Caregiver); client? (Client); application? (CaregiverApplication); intake? (ClientIntake); rendered_file (StoredFile); requested_signer (User); status (CharField) |
| StateBranch / `operations_statebranch` | agency (Agency); state_code (CharField); display_name (CharField); timezone (CharField); active (BooleanField) |
| StoredFile / `operations_storedfile` | branch (StateBranch); private_storage_key (CharField); original_name (CharField); content_type (CharField); byte_size (PositiveBigIntegerField); sha256 (CharField); uploaded_by? (User); validation_status (CharField) |
| TrainingAssignment / `operations_trainingassignment` | branch (StateBranch); caregiver (Caregiver); course_version (TrainingCourseVersion); assigned_by (User); assigned_at (DateTimeField); due_at? (DateTimeField); required (BooleanField); progress_percent (PositiveSmallIntegerField); started_at? (DateTimeField); completed_at? (DateTimeField) |
| TrainingCertificate / `operations_trainingcertificate` | branch (StateBranch); assignment (TrainingAssignment); file (StoredFile); issued_at (DateTimeField); certificate_reference (CharField) |
| TrainingCourse / `operations_trainingcourse` | title (CharField); description (TextField); active (BooleanField) |
| TrainingCourseVersion / `operations_trainingcourseversion` | course (TrainingCourse); version_number (PositiveIntegerField); content (TextField); published_at? (DateTimeField) |
| WebsiteInquiry / `operations_websiteinquiry` | branch (StateBranch); name (CharField); email (CharField); phone (CharField); subject (CharField); message (TextField); submitted_at (DateTimeField); status (CharField) |
