# Phases (update status here, not in AGENTS.md)
- [ ] 0 Foundation: scope + open-decisions docs, scripts and .env.example, custom User, Agency/Branch/Membership,
      seed command, session/CSRF login/me, role routes, public home + FL/IN/GA switcher, dashboard shells,
      one seeded user per role, tests for unauthorized/escalation/wrong-branch.
- [ ] 1 Caregiver onboarding: application + status, checklist + fake upload, staff document review + audit,
      dashboard statuses, wrong-caregiver/wrong-branch denial tests.
- [ ] 2 Client intake + authorization: synthetic intake + review, care-plan/schedule placeholders,
      authorization expiry item, client and state isolation tests.
- [ ] 3 Training, notifications, reporting: assignments/overdue, idempotent outbox, branch-scoped dashboards, one e2e test.
- [ ] 4 Agency review: confirm requirements, replace demo logic, complete owner-gates.
Start with Phase 0 only.