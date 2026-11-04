# Caregiver Platform — Frontend Design & RBAC Context Guide

> **Requirements authority (2026-11-05):** Read [the Scope of Work](../docs/Scope%20of%20work.md), [agent build guide](../docs/AGENT_BUILD_GUIDE.md) and [root instructions](../AGENTS.md) first. Only the Scope of Work establishes product requirements; this file is an implementation reference. Build basic functioning flows while agency processes remain pending. Existing navigation, components and statuses do not authorize added business workflows. Secure agency messaging is optional; email/SMS and all six reports remain required.
>
> **Target Audience**: AI coding agents working in this repository.
> **Primary Rule**: Always preserve design system consistency and enforce fail-closed state-scoped Role-Based Access Control (RBAC).

---

## 1. Project Overview & Repository Map

- **Frontend**: `frontend/` — React 19, Vite, Tailwind CSS v4 (`@tailwindcss/vite`), Radix UI, Lucide React, React Router v7, TanStack Query v5.
- **Backend**: `backend/apps/` — Django + DRF + SimpleJWT, Django ORM/migrations, SQLite locally or configured PostgreSQL. No FastAPI or Supabase auth.
- **Specifications & Schemas**: `docs/` — supporting references subordinate to `Scope of work.md`. Verify current routes, serializers, models/migrations and consumers when examples conflict.
- **HTTP transport**: `src/shared/services/api.js` wraps fetch, adds the bearer token and `X-Agency-State`, and handles refresh. Preserve `/auth/me/` and its compatibility fallback.

---

## 2. Frontend Design System

### 2.1 Aesthetic & Visual Principles
- **Clinical B2B SaaS**: Clean, trustworthy, high contrast, medical-grade clarity.
- **Anti-AI-Slop**: No gratuitous background gradients, glowing borders, floating pill gimmicks, or low-contrast text.
- **ADHD-Friendly Layout**: Clear visual hierarchy, scannable tables, bold metric callouts, and bounded action buttons.

### 2.2 Color Tokens & Theme System (`frontend/src/index.css`)
- **Primary / Brand**: Emerald (`#16a34a` / `hsl(142.1 76.2% 36.3%)`), hover: `emerald-700`.
- **Canvas / Background**: `bg-slate-50` (`#f8fafc`).
- **Cards & Surfaces**: `bg-white` with `border border-slate-200 shadow-xs rounded-lg`.
- **Typography Scale**:
  - Headings: `text-slate-900 font-bold tracking-tight` (`text-xl` to `text-2xl` for page headers).
  - Body: `text-slate-700 text-sm`.
  - Captions & Meta: `text-slate-500 text-xs`.
- **Semantic Statuses** (enforced via `StatusBadge.jsx`):
  - **Success** (`bg-emerald-50 text-emerald-800 border-emerald-200`): `active`, `approved`, `completed`, `pass`, `valid`, `signed`, `hired`.
  - **Warning** (`bg-amber-50 text-amber-800 border-amber-200`): `pending`, `draft`, `submitted`, `in_review`, `under_review`, `expiring_soon`.
  - **Error / Destructive** (`bg-red-50 text-red-800 border-red-200`): `rejected`, `expired`, `suspended`, `terminated`, `discharged`, `failed`.
  - **Neutral** (`bg-slate-50 text-slate-700 border-slate-200`): `info`, `not_started`, `archived`.

### 2.3 Shell & Navigation Architecture
- **Layout Shell**: `src/shared/components/sidebar/PortalShell.jsx` wraps authenticated views:
  - Collapsible desktop sidebar (`PortalSidebar.jsx`, state saved in `localStorage['cp_sidebar_collapsed']`).
  - Mobile slide-out drawer (`mobileOpen` + ESC key handler).
  - Top navigation bar (`PortalTopBar.jsx`) with dynamic state jurisdiction pill, unread notifications badge, and profile/logout menu.
- **Sectioned Nav Menus**:
  - **Admin**: Overview (Dashboard) | People (Caregivers, Clients, Users, Referrals) | Operations (Compliance, Authorizations, Training) | Oversight (Reports, Announcements, Audit Logs) | System (Settings, Notifications).
  - **Caregiver**: Overview (Dashboard) | Care Delivery (My Clients) | Onboarding (Application) | Compliance (Credentials, Training) | Account (Profile, Notifications).
  - **Client**: Overview (Dashboard) | My Care (Care Plan, Schedule) | Documents & Records (Intake, Forms, Records, Authorizations) | Account (Profile, Alerts).

### 2.4 Reusable Component Catalog
When building or modifying pages, use these standard components from `src/shared/components/common/` and `@/components/ui/`:

1. **Layout Wrapper**: `PageContainer` (`size="default" | "narrow" | "wide"`).
2. **Page Header**: `PageHeader` (`title`, `subtitle`, `badge`, `actions`, `breadcrumbs`).
3. **Card Container**: `Card` (`title`, `subtitle`, `actions`, `compact`).
4. **Data Grid**: `DataTable` (pagination, search, sorting, empty states).
5. **Status Badges**: `StatusBadge` (`status`, `label`, `size="xs"|"sm"|"md"`).
6. **Feedback & States**: `LoadingState`, `Skeleton`, `EmptyState`, `ErrorBoundary`.
7. **Interactive Modals**: `ConfirmModal` for confirmations/deletions.
8. **UI Primitives (`src/components/ui/`)**: `Button`, `Badge`, `Input`, `Select`, `Dialog`, `Tabs`, `Table`, `DropdownMenu`.

### 2.5 Standard Page Template Pattern
```jsx
import PageContainer from '../../../shared/components/common/PageContainer';
import PageHeader from '../../../shared/components/common/PageHeader';
import Card from '../../../shared/components/common/Card';
import StatusBadge from '../../../shared/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import useFetch from '../../../shared/hooks/useFetch';

export default function ExamplePage() {
  const { data, loading, error, refetch } = useFetch('/admin/example');

  return (
    <PageContainer>
      <PageHeader
        title="Page Title"
        subtitle="Concise explanation of this operational view."
        actions={
          <Button onClick={refetch} variant="outline" size="sm">
            Refresh
          </Button>
        }
      />
      <Card title="Section Overview" subtitle="Key details and status">
        {/* Table, metrics, or form contents */}
      </Card>
    </PageContainer>
  );
}
```

---

## 3. Role-Based Access Control (RBAC) & State Scoping

### 3.1 The 4 Tiers of Authorization

| Role Key | Name | Access Boundary | State Scoping Rule |
|---|---|---|---|
| `super_admin` | Super Administrator | Global system & multi-state oversight | `state_id IS NULL` (All states: FL, IN, GA). Can view/switch any state. |
| `administrator` | State Administrator | Single assigned state branch | `state_id` NOT NULL (1=FL, 2=IN, 3=GA). Must NEVER access other states. |
| `caregiver` | Caregiver / Aide | Own credentials, training, assigned clients | Self profile + assigned client IDs only. |
| `client` | Client / Patient / Family | Own intake, care plan, visit schedules, forms | Self profile and own signed agreements only. |

*(Public visitors access `/:state` landing pages and `/caregiver/application` unauthenticated).*

### 3.2 Frontend RBAC Implementation Rules

1. **Always Use Role Helpers**: Import from `src/shared/lib/roles.js`.
   ```js
   import { isAdmin, isSuperAdmin, homePathFor, stateLabelFor } from '../shared/lib/roles';
   ```
   - **DO NOT** use `role === 'administrator'` directly, as it ignores `super_admin` and drops them into caregiver fallbacks.
   - Use `isAdmin(user)` to check for both `super_admin` and `administrator`.
   - Use `isSuperAdmin(user)` when guarding national-only features (e.g. user administration, system settings, global switching).

2. **Portal Route Protection (`src/routes/AppRoutes.jsx`)**:
   - `/admin/*` guarded by `AdminLayout.jsx` (requires `isAdmin(user) === true`).
   - `/caregiver/*` guarded by `CaregiverLayout.jsx` (requires `user.role === 'caregiver'`).
   - `/client/*` guarded by `ClientLayout.jsx` (requires `user.role === 'client'`).
   - Unauthenticated users redirect to `/caregiver/login` or `/client/login`.

3. **State Jurisdiction Selector Rules in UI**:
   - For `super_admin`: State dropdown allows selecting `"all"` (All States) or specific states (`florida`, `indiana`, `georgia`).
   - For `administrator`: State dropdown must be **disabled or hidden**, locked strictly to the administrator's assigned state (`user.state_id` / `stateLabelFor(user)`).
   - Never allow state administrators to send query params requesting records for another state.

### 3.3 Backend RBAC & State Isolation

Reuse `backend/apps/core/permissions.py` and existing scoped querysets. Resolve identity, role and state from authenticated server records, not caller-supplied ownership or headers. `IsStateScopedAdmin` rejects administrators with no assigned state and enforces matching state on objects. Apply ownership/assignment checks to direct requests as well as lists. Public state switching never authorizes private-record access. Do not introduce FastAPI dependency patterns or ad-hoc role checks.

### 3.4 Audit Logging & Document Integrity
- Follow [the security baseline](../docs/SECURITY_REQUIREMENTS.md) for protected files, audit events and signatures. Verify actual coverage; this document does not certify an immutable database or legal non-repudiation.
- Exclude secrets and unnecessary sensitive payloads from logs. Bind signatures to the content/version actually presented and preserve prior evidence.

---

## 4. Agent Checklist for New / Refactored Features

Follow this 5-step checklist for any frontend page or API endpoint:

1. **Verify Route & Role Guard**:
   - Check if page is inside `AdminLayout`, `CaregiverLayout`, or `ClientLayout`.
   - Ensure role check uses `isAdmin(user)` or `isSuperAdmin(user)` from `roles.js`.
2. **Enforce State Scope**:
   - If admin page has a state filter, ensure `administrator` cannot switch outside their assigned state.
   - Backend endpoint reuses Django permissions and scoped querysets, with object ownership/state checks.
3. **Apply Shell & Containers**:
   - Wrap page content in `<PageContainer>`.
   - Provide `<PageHeader title="..." subtitle="..." actions={...} />`.
4. **Standardize Cards & Badges**:
   - Wrap sections in `<Card>`.
   - Format statuses with `<StatusBadge status={item.status} />`.
5. **Verify Loading, Empty, and Error States**:
   - Provide `<Skeleton>` or `<LoadingState>` while fetching.
   - Provide `<EmptyState>` when lists are empty.
   - Handle API errors gracefully with `<Alert variant="destructive">` or Toast.
