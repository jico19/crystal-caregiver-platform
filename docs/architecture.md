# Architecture

Demo workflow — pending agency confirmation.

Django/DRF serves `/api/v1/`; React/Vite uses the shared Axios client and TanStack
Query. Vite proxies local API traffic to Django. Authentication uses Django
sessions, an HttpOnly cookie and a CSRF bootstrap token. No localStorage tokens.

`accounts` owns authentication/invitations; `operations` holds branch-scoped
domain models and workflows. Services enforce business rules and atomic audit.
`admin_branches` combines active AgencyAdmin and administrator BranchStaff
assignments. `scope_people` adds active owned records. Ordinary staff and Django
admin flags alone grant no management access.

SQLite is the local prototype database. Additive migrations enforce constraints,
branch matching, immutable versions and append-only history. PostgreSQL uses a
separate guard implementation and requires later validation before migration.

Published BranchContent is public; private directories and applications are
scoped before filtering or lookup. Future files must use authorized downloads,
private random storage keys and approved synthetic fixtures only.

Frontend form handling uses React Hook Form/Zod. Backend validation remains the
authority. Notifications use local/test transport; no external demo vendors.
