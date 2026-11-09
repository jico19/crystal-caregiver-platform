# Database schema

Demo workflow - pending agency confirmation. SQLite prototype; PostgreSQL validation deferred.

Existing model inventory. Models for later phases are not implemented workflows.

- **Agency**: id, public_id, created_at, updated_at, name
- **StateBranch**: id, public_id, created_at, updated_at, agency, state_code, display_name, timezone, active
- **AgencyAdmin**: id, public_id, created_at, updated_at, agency, user, active
- **BranchStaff**: id, public_id, created_at, updated_at, branch, user, role, active
- **Caregiver**: id, public_id, created_at, updated_at, branch, user, name, email, phone, active, onboarding_status
- **Client**: id, public_id, created_at, updated_at, branch, user, name, email, phone, active, admission_status, service_start_date
- **JobPosting**: id, public_id, created_at, updated_at, branch, title, description, published, form_version
- **JobSubmission**: id, public_id, created_at, updated_at, branch, job, caregiver, application
- **BranchContent**: id, public_id, created_at, updated_at, branch, content_key, title, body, publication_status
- **WebsiteInquiry**: id, public_id, created_at, updated_at, branch, name, email, phone, subject, message, submitted_at, status
- **ReferralSource**: id, public_id, created_at, updated_at, branch, name, source_type, active
- **ClientReferral**: id, public_id, created_at, updated_at, branch, client, source, source_name_snapshot, referrer_contact, received_at, status
- **StoredFile**: id, public_id, created_at, updated_at, branch, private_storage_key, original_name, content_type, byte_size, sha256, uploaded_by, validation_status
- **DocumentType**: id, public_id, created_at, updated_at, code, label, audience, active
- **BranchDocumentRequirement**: id, public_id, created_at, updated_at, branch, document_type, required, tracks_expiration, active
- **Document**: id, public_id, created_at, updated_at, branch, document_type, caregiver, client
- **DocumentVersion**: id, public_id, created_at, updated_at, branch, document, version_number, file, issued_on, expires_on, submitted_at, review_status
- **DocumentReview**: id, public_id, created_at, updated_at, branch, document_version, reviewer, decision, comment, reviewed_at
- **FormTemplate**: id, public_id, created_at, updated_at, branch, audience, kind, title, active
- **FormVersion**: id, public_id, created_at, updated_at, branch, template, version_number, field_schema, instruction_text, consent_text, packet_file, published_at
- **SignatureRequest**: id, public_id, created_at, updated_at, branch, form_version, caregiver, client, application, intake, rendered_file, requested_signer, status
- **SignatureEvent**: id, public_id, created_at, updated_at, branch, request, signer, signer_name_snapshot, consent_text_snapshot, signed_at, signed_file, document_hash, provider_reference
- **CaregiverApplication**: id, public_id, created_at, updated_at, branch, caregiver, form_version, submitted_answers, status, submitted_at
- **ClientIntake**: id, public_id, created_at, updated_at, branch, client, referral, form_version, submitted_answers, status, submitted_at
- **ApplicationReview**: id, public_id, created_at, updated_at, branch, previous_status, new_status, reviewer, comment, reviewed_at, application
- **IntakeReview**: id, public_id, created_at, updated_at, branch, previous_status, new_status, reviewer, comment, reviewed_at, intake
- **TrainingCourse**: id, public_id, created_at, updated_at, title, description, active
- **TrainingCourseVersion**: id, public_id, created_at, updated_at, course, version_number, content, published_at
- **TrainingAssignment**: id, public_id, created_at, updated_at, branch, caregiver, course_version, assigned_by, assigned_at, due_at, required, progress_percent, started_at, completed_at
- **TrainingCertificate**: id, public_id, created_at, updated_at, branch, assignment, file, issued_at, certificate_reference
- **ClientAuthorization**: id, public_id, created_at, updated_at, branch, client, reference, issuer_name, status, valid_from, valid_until, supersedes
- **AuthorizationDocument**: id, public_id, created_at, updated_at, branch, authorization, document_version
- **AuthorizationEvent**: id, public_id, created_at, updated_at, branch, authorization, actor, previous_status, new_status, comment, occurred_at
- **CarePlan**: id, public_id, created_at, updated_at, branch, client, version_number, summary, document_version, effective_from, effective_until, recorded_by
- **ServiceScheduleEntry**: id, public_id, created_at, updated_at, branch, client, starts_at, ends_at, timezone, service_label, status, recorded_by
- **Announcement**: id, public_id, created_at, updated_at, branch, audience, title, body, published_at, expires_at, author
- **ReminderRule**: id, public_id, created_at, updated_at, branch, event_type, channel, lead_days, enabled
- **Notification**: id, public_id, created_at, updated_at, branch, recipient_user, caregiver, client, event_type, subject_reference, deduplication_key, safe_content, read_at
- **NotificationDelivery**: id, public_id, created_at, updated_at, branch, notification, channel, recipient_snapshot, scheduled_at, status, simulated, provider_reference
- **DeliveryAttempt**: id, public_id, created_at, updated_at, branch, delivery, attempt_number, attempted_at, outcome, safe_error_code
- **AuditEvent**: id, public_id, created_at, updated_at, branch, actor, action, resource_type, resource_id, occurred_at, safe_metadata
