# Workflows (illustrative, pending agency confirmation)
- Caregiver: submitted → under review → approved/rejected → onboarding → eligible/active
- Document: required → uploaded → pending review → approved/rejected → expiring/expired (keep review history)
- Client: inquiry/intake → under review → admitted/declined → active
- Authorization: submitted → under review → active/denied → expiring/expired
- Training: assigned → in progress → completed/overdue
Transitions are enforced in services with permission checks, history rows, and audit events.
Expiry is computed from stored dates in the app time zone; reminder window is configurable (default 30 days).