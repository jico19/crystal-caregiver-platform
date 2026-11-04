# Platform Design Specification: Multi-State Caregiver Platform (FL, IN, GA)

> **Scope authority (2026-11-05):** [Scope of work.md](Scope%20of%20work.md) is the sole product requirements baseline. Read [AGENT_BUILD_GUIDE.md](AGENT_BUILD_GUIDE.md). This file provides visual guidance; layouts, tokens and examples are implementation choices. Build basic working flows while agency content and process remain pending. Do not infer additional business requirements from a mockup.

## 1. Product Direction & Anti-Slop Foundation

Healthcare and home care operations require speed, calm visual clarity, and error prevention. Shift coordinators review hundreds of credentials daily; caregivers upload documents on mobile phones under varying light conditions; clients and family members navigate services under emotional stress.

### Anti-Slop Rules
1. **No decorative cards or empty metric tiles**: Every card must contain actionable data or direct navigation.
2. **Dense, scannable data for operators; streamlined single-column flows for mobile caregivers**: Do not force admin grids onto mobile, and do not waste desktop desktop screen real estate on oversized whitespace.
3. **Tabular numbers for compliance**: Expiration dates, counts, and hours use `font-variant-numeric: tabular-nums` to prevent misalignment in tables and lists.
4. **Color communicates status, never decoration**: Color is reserved for state jurisdiction, document compliance status, and explicit primary actions.
5. **Multi-state context is always visible**: The active state (Florida, Indiana, or Georgia) is locked in persistent chrome to prevent cross-jurisdiction data entry errors.

---

## 2. Color System & Design Tokens (Tailwind v4)

### State Jurisdiction Branding
- **Florida (FL)**: `text-amber-900 bg-amber-50 border-amber-200` (Sun / Sunshine State motif)
- **Indiana (IN)**: `text-sky-900 bg-sky-50 border-sky-200` (Crossroads blue)
- **Georgia (GA)**: `text-emerald-900 bg-emerald-50 border-emerald-200` (Peach / Forest green)

### Semantic Compliance Palette
- **Compliant / Active**: `#059669` (`emerald-600`), surface `#ecfdf5` (`emerald-50`), border `#a7f3d0` (`emerald-200`)
- **Expiring Soon (configured warning window; agency timing pending)**: `#d97706` (`amber-600`), surface `#fffbeb` (`amber-50`), border `#fde68a` (`amber-200`)
- **Expired / Urgent Action**: `#dc2626` (`red-600`), surface `#fef2f2` (`red-50`), border `#fecaca` (`red-200`)
- **Missing / Action Required**: `#475569` (`slate-600`), surface `#f8fafc` (`slate-50`), border `#cbd5e1` (`slate-300`)

### Neutral Surface Hierarchy
- **Canvas Base**: `#f8fafc` (`slate-50`)
- **Elevated Card**: `#ffffff` (`white`), border `1px solid #e2e8f0` (`slate-200`)
- **Subtle Row Zebra / Hover**: `#f1f5f9` (`slate-100`)
- **Text Primary**: `#0f172a` (`slate-900`, WCAG contrast 15.8:1)
- **Text Muted**: `#475569` (`slate-600`, WCAG contrast 5.7:1)
- **Text Subtle**: `#64748b` (`slate-500`, WCAG contrast 4.6:1)

---

## 3. Typography & Sizing

- **Primary Font**: `Inter, system-ui, -apple-system, sans-serif`
- **Tabular Font**: `ui-monospace, SFMono-Regular, Menlo, monospace` for document IDs, expiration countdowns, phone numbers, and timestamps.
- **Scale**:
  - `text-xs` (12px / 16px): Status badges, table headers, timestamp metadata.
  - `text-sm` (14px / 20px): Form labels, table cells, navigation links, body copy.
  - `text-base` (16px / 24px): Mobile input default (prevents iOS auto-zoom), primary buttons.
  - `text-lg` (18px / 28px): Section headings, modal titles.
  - `text-2xl` (24px / 32px): Dashboard page headers.

---

## 4. Navigation Architecture & Multi-State Switcher

### Global Header Chrome
1. **Persistent State Selector**:
   - Sticky top bar dropdown/segmented control: `[ FL | IN | GA ]`.
   - Public state switching changes the displayed services, forms, licensing and regional contact details. It never changes private-record permissions. State administrators remain locked to their assigned state; use existing super-admin controls where authorized.
   - Display only approved agency licensing information for the selected state.
2. **Role Switcher & Session State**:
   - Public Landing: `Caregivers | Families & Clients | Provider Portal | Contact`.
   - Authenticated Portals: Dedicated layouts per persona (Caregiver, Client, Admin).

---

## 5. Portal Blueprint 1: Caregiver Mobile-First Portal

### Primary User Goal
Complete onboarding, upload documents on mobile, track credential status, and access online in-service training. Course format and completion policy require agency confirmation.

### Key Layouts & Workflows
1. **Compliance Health Banner (Top of Screen)**:
   - High-visibility banner if any document is expired or within the configured warning window (timing remains pending agency confirmation):
     - Example: `[Urgent] CPR Certificate expires in 8 days. [Upload New Certificate]`.
2. **Credential Tracker Card Group**:
   - 3-column progress summary: `Compliant (9)` | `Expiring Soon (1)` | `Missing (2)`.
   - Document list with direct action buttons:
     - Driver's License (`Expires 12/2027` - `[View]`)
     - CPR Certificate (`Expires in 8 days` - `[Renew/Upload]`)
     - TB Test (`Expired 10/01/2026` - `[Upload Now]`)
3. **Mobile Document Upload Flow**:
   - Large touch target (min 48px height): `[ Take Photo / Choose File ]`.
   - Validate against actual supported file types and size limits; auto-crop/compression is an optional enhancement.
   - Show expiration date input for document types configured to expire; agency confirms applicable types.
   - Provide clear file selection, upload result and retry feedback. Preview layout is a design choice.
4. **In-Service Training Hub**:
   - Show saved course status and actual progress; percentages and due dates must have a real source.
   - Provide access to supplied course content. Videos, quizzes, pass scores, validity and completion proof remain agency decisions.
   - Offer certificate download for recorded completion; make the limits of any provisional manual completion process clear in the handoff.
5. **Electronic Signature Pad**:
   - Accessible electronic signature capture tied to the exact presented form. Signature method and official wording require agency confirmation; do not claim legal validity from UI alone.
   - Audit trail stamping (Timestamp, IP Address, Device user agent).

---

## 6. Portal Blueprint 2: Client & Family Intake Portal

### Primary User Goal
Complete stress-free admission paperwork, upload insurance/Medicaid cards, track Medicaid/Private Pay authorizations, and view current care schedules.

### Key Layouts & Workflows
1. **Intake Stepper (Progressive Disclosure)**:
   - The steps below are a provisional layout, not approved form fields or mandatory clinical intake stages. Use official agency forms when supplied.
   - Step 1: Client & Emergency Contact Profile.
   - Step 2: Care Needs & Physician Information.
   - Step 3: Insurance & Medicaid Card Upload (Front & Back capture).
   - Step 4: Electronic Admission Packet & HIPAA Consent Signing.
2. **Authorization Status Monitor**:
   - Show actual authorization status, dates, uploaded records and history. Do not require billing units or calculate remaining balances solely from this design.
   - Distinguish uploaded/pending staff review from confirmed payer approval using the agreed process; avoid implying automatic insurer/state integration.
3. **Care Plan & Schedule Glance**:
   - Show the client's actual saved care plan and service schedule. Calendar layout and staff entry are basic implementation choices; data source and clinical/scheduling workflow remain pending.
   - Secure agency messaging is optional; do not display a nonfunctional messaging action as completed scope.

---

## 7. Portal Blueprint 3: Administrator Operations Command Center

### Primary User Goal
Review inbound applications, approve/reject caregiver credentials, monitor state compliance audits, track client authorizations, and run compliance reports.

### Key Layouts & Workflows
1. **Top Metric Bar (Zero Fluff)**:
   - Example metrics: pending applications, expiring credentials, expiring authorizations and intake reviews. Show real counts; warning windows are configured defaults pending agency confirmation.
2. **Compliance Data Table**:
   - Dense rows with fixed headers and horizontal scrolling support.
   - Example columns: caregiver, state, onboarding status, missing/expired requirements, next expiration and actions. A compliance percentage needs a defined denominator; do not invent one.
   - Actions should match actual workflows: view documents, review application and send reminder. Do not claim an SMS was sent before the delivery system reports that state.
3. **Document Verification Split-Screen Drawer**:
   - Left pane: Caregiver input details & expiration date input.
   - Right pane: High-resolution PDF/image preview with zoom, rotate, and full-screen controls.
   - Action buttons fixed at bottom: `[Reject with Reason]`, `[Approve & Record]`.
4. **Reports**:
   - Provide the six scope reports: caregiver compliance, expiring credentials, in-service completion, client authorizations, referral sources and website inquiries. Columns and definitions remain pending agency input. CSV/PDF export and surveyor-specific formats are optional enhancements.

---

## 8. Form & Component Craft Standards

### Form Inputs
- Floating or persistent high-contrast labels (`text-slate-800 font-medium text-xs`).
- Explicit error states: Red left border (`border-l-4 border-l-red-500`) + explicit helper text below the field.
- Mandatory field indicator: Distinct red asterisk with `aria-hidden="true"` and `required` attribute.

### Buttons & Targets
- Primary action: Solid slate-900 / white text, 8px rounded, 44px min height.
- Secondary action: White background, slate-300 border, slate-700 text.
- Destructive action: Crimson red border/text on hover, requires confirmation dialog for permanent deletions.
- Touch target floor: Minimum 44px x 44px across all mobile viewports.

### Dialogs & Modals
- Backdrop blur `backdrop-blur-sm bg-slate-900/40`.
- Explicit dismiss buttons (Esc key, outside click, top-right 'X', and secondary cancel button).
- Locked body scroll during open modal state.

---

## 9. shadcn/ui + Tailwind CSS (v4) Architecture

The platform uses **shadcn/ui** built on Tailwind CSS v4 and React primitives. All UI builds on semantic tokens rather than one-off utility overrides.

### Component Mapping to Scope of Work

| Portal Feature | shadcn Primitive | Role & Customization |
| :--- | :--- | :--- |
| **State Switcher (FL/IN/GA)** | `ToggleGroup` / `Select` | Segmented control with state color badges |
| **Compliance Status** | `Badge` (custom variants) | `compliant`, `expiring`, `expired`, `missing` |
| **Expiry Alerts** | `Alert` + `AlertTitle` | High-contrast banners at top of caregiver/admin portals |
| **Admin Compliance Grid** | `Table` | Fixed header, dense rows, tabular numerals |
| **Document Inspector** | `Sheet` (Drawer) | Split-screen drawer (form fields left, zoom viewer right) |
| **Onboarding & Upload** | `FieldGroup` + `Field` + `Input` | Semantic accessible form inputs with `data-invalid` |
| **In-Service Training** | `Card` + `Progress` | Actual saved progress/status and certificate download; no fabricated percentages |
| **Portal Navigation** | `Tabs` + `TabsList` | Sub-navigation between compliance, training, and profile |
| **Audit & Confirmation** | `AlertDialog` | Confirmation for document rejection or applicant removal |
| **Action Notifications** | `sonner` (`toast`) | Accurate upload and delivery feedback: pending, sent or failed as recorded |

### Tailwind v4 Semantic Tokens (`frontend/src/index.css`)
```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 210 40% 98%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --primary: 222 47% 11%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222 47% 11%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --accent: 210 40% 96%;
    --accent-foreground: 222 47% 11%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 210 40% 98%;
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 222 47% 11%;
    --radius: 0.5rem;
    
    /* Healthcare Compliance Status Tokens */
    --status-compliant: 158 64% 52%;
    --status-expiring: 38 92% 50%;
    --status-urgent: 0 84% 60%;
  }
}
```

---

## 10. Implementation Steps for Frontend

The following is a historical setup reference, not a required reinstall or redesign plan. Inspect the existing frontend and reuse its components. Do not initialize shadcn or replace tokens merely because these commands are listed.

1. **Configure path aliases**: Add `@/*` alias to `frontend/vite.config.js` and `frontend/jsconfig.json`.
2. **Initialize shadcn**: Run `npx shadcn@latest init` inside `frontend/`.
3. **Install core primitives**:
   ```bash
   npx shadcn@latest add button badge table card dialog sheet tabs alert progress toggle-group sonner
   ```
4. **Build Core Components**:
   - `StateSelector.jsx` (FL / IN / GA persistent switcher)
   - `ComplianceBadge.jsx` (Compliant, Expiring Soon, Expired, Missing)
   - `CaregiverDashboard.jsx` (Mobile upload + training tracker)
   - `AdminComplianceTable.jsx` (Dense roster + drawer inspector)

