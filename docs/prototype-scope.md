# Prototype scope

Demo workflow — pending agency confirmation. Synthetic data only.

The foundation includes public FL/IN/GA content and job listings, synthetic job
applications, session login/logout, password reset, administrator invitations,
scoped caregiver/client directories and protected portal shells.

BranchContent stores configurable services, forms, licensing and contact copy.
The public API exposes only published entries in active branches. Seed defaults
are illustrative; rerunning the seed preserves operator edits and publication state.

Phase 1 follows the versioned specs in `specs/`. Later client, training,
notification and reporting workflows remain separate phases. Existing models for
these domains do not imply working end-to-end features.

Development/prototype uses SQLite. PostgreSQL migration and integrity validation
is deferred by owner instruction until migration work; SQLite tests are not
evidence of PostgreSQL compatibility. No production-readiness claim is made.
