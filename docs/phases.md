# Phases (update status here, not in AGENTS.md)
- [x] 0 Foundation: scope + open-decisions docs, scripts and .env.example, custom User, Agency/Branch/Membership,
      seed command, session/CSRF login/me, role routes, public home + FL/IN/GA switcher, dashboard shells,
      one seeded user per role, tests for unauthorized/escalation/wrong-branch.
- [x] 1 Caregiver onboarding: application + status, checklist + fake upload, staff document review + audit,
      dashboard statuses, wrong-caregiver/wrong-branch denial tests.
- [ ] 2 Client intake + authorization: synthetic intake + review, care-plan/schedule placeholders,
      authorization expiry item, client and state isolation tests.
- [ ] 3 Training, notifications, reporting: assignments/overdue, idempotent outbox, branch-scoped dashboards, one e2e test.
- [ ] 4 Agency review: confirm requirements, replace demo logic, complete owner-gates.
Phase 1 implemented and verified on SQLite. PostgreSQL validation is deferred by
owner instruction. See docs/phase-0-evidence.md and docs/phase-1-evidence.md.
Awaiting the next phase instruction.
