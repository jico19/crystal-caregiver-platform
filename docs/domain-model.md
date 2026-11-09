# Domain model
One Agency, three StateBranches (FL, IN, GA). Branch is an access boundary, not a frontend filter.
Users link to branches through Membership (role, branch, active). Cross-branch rules pending the agency.

Roles: Visitor (public pages, submit application/inquiry), Caregiver (own profile/docs/training),
Client (own intake/docs/authorizations/care plan), Staff (assigned branches), Agency admin (all branches, cross-state reports).
Auth alone never grants access. Don't use `is_staff` as business authorization.

Models: User, Agency, StateBranch, Membership, CaregiverProfile, CaregiverApplication,
OnboardingChecklistItem, ClientProfile, ClientIntake, CarePlanSummary, ServiceScheduleEntry,
DocumentRequirement, DocumentRecord, TrainingCourse, TrainingAssignment, TrainingCompletion,
ClientAuthorization, NotificationTemplate, NotificationOutbox, SignatureEvent, AuditEvent.
Create each when its slice needs it.
Use tz-aware timestamps, status enums, indexes on filtered fields, UUID public IDs.