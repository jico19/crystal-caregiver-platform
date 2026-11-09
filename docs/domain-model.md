# Domain model

Demo workflow - pending agency confirmation. Synthetic data only.

Agency owns StateBranch records (FL/IN/GA). Active AgencyAdmin assignments grant
access to that agency's active branches. Active administrator BranchStaff grants
access to its assigned branch. Ordinary staff and Django admin flags alone grant
no management access. Caregiver and Client link active owned profiles to branches;
these assignments are additive. The earlier conceptual Membership model is not
used by the current implementation.

Phase 1 reuses CaregiverApplication, ApplicationReview, FormTemplate/FormVersion,
JobPosting/JobSubmission, DocumentType/BranchDocumentRequirement, Document,
DocumentVersion, StoredFile, DocumentReview and AuditEvent. It adds per-branch
BranchOnboardingPolicy and immutable CaregiverOnboardingEvent milestones.

Application and document versions retain original answers/bytes. Reviews and
milestones are append-only. Branch/subject matching, unique versions/reviews and
valid statuses are enforced by additive database constraints and guards. Public
API identifiers are UUIDs. Current checklist readiness is derived separately from
historical completion. Internal eligible is displayed as Demo onboarding complete.

See DATABASE_SCHEMA.md for the full model inventory. Models for later phases do
not imply implemented client, training, care, signature or notification workflows.
SQLite is the prototype database; PostgreSQL validation is deferred until migration.
