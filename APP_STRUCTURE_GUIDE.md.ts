# ClientPortal App Architecture & Page Structure Guide

**Version:** 1.0  
**Date:** 2026-02-05  
**Purpose:** Visual & structural reference for launch preparation

---

## OVERVIEW

The ClientPortal is a comprehensive React application organized into a multi-tab dashboard system with protected routes, role-based access control, and real-time data synchronization.

**Stack:**
- Frontend: React 18 + TypeScript (in transition)
- UI Components: shadcn/ui + Tailwind CSS
- State Management: TanStack React Query
- Auth: Base44 Auth (migrating to NextAuth.js)
- Database: Base44 Entities (migrating to PostgreSQL + Prisma)

---

## PAGE HIERARCHY

```
ClientPortal (pages/ClientPortal.jsx)
├── Onboarding Layer
│   └── EnhancedClientOnboarding (modal overlay)
│       ├── Welcome Step
│       ├── Industry Selection
│       ├── Feature Discovery
│       ├── Getting Started Checklist
│       ├── Profile Completion
│       └── Next Steps
│
├── Main Navigation Tabs
│   ├── Dashboard
│   │   ├── EnhancedClientDashboard
│   │   ├── ClientDashboard
│   │   └── EnhancedAnalyticsDashboard
│   │
│   ├── Projects
│   │   ├── ProjectDetailsCard
│   │   ├── ProjectsHubModule
│   │   └── TaskManagementPanel (Kanban board)
│   │       ├── Task Card Component
│   │       ├── Task Dialog
│   │       └── Status Filters
│   │
│   ├── Communications
│   │   └── EnhancedCommunicationHub
│   │       ├── Project Selector
│   │       ├── Threaded Message View
│   │       ├── File Attachment Handler
│   │       └── @Mention System
│   │
│   ├── Invoices
│   │   └── ClientInvoices
│   │       ├── Invoice List
│   │       ├── Line Items
│   │       └── Payment Actions
│   │
│   ├── Reports
│   │   └── AdvancedClientReporting
│   │       ├── Filter Panel (date, project, status)
│   │       ├── Metric Cards
│   │       ├── Chart Visualizations
│   │       │   ├── Project Status Pie Chart
│   │       │   ├── Budget Spending Area Chart
│   │       │   ├── Project Progress Bar Chart
│   │       │   └── Communication Activity Line Chart
│   │       └── Export Controls (CSV/PDF)
│   │
│   └── Profile (Sub-tabs)
│       ├── Account Settings
│       │   └── ClientProfileSettings
│       ├── Team Management
│       │   └── ClientTeamManagement
│       └── Workflow
│           └── ClientWorkflowSettings
│
├── Floating Components
│   ├── NotificationBell (top right)
│   │   └── ClientNotificationFeed
│   ├── NotificationPreferences (modal)
│   └── AIAssistant (bottom right floating)
│
└── Error Boundary
    └── ClientPortalErrorBoundary
```

---

## DETAILED PAGE BREAKDOWN

### 1. DASHBOARD TAB

**Route:** `/clientportal?tab=dashboard`  
**Components:** 3 major dashboards stacked vertically

#### EnhancedClientDashboard (Top)
- **Purpose:** Quick-glance project metrics & status
- **Layout:**
  - Header card (company name, project count)
  - 4 metric cards (active projects, outstanding balance, upcoming tasks, overdue items)
  - Invoice summary (paid/outstanding/overdue breakdown)
  - Upcoming tasks timeline
  - Overdue items alert

#### ClientDashboard (Middle)
- **Purpose:** Classic dashboard with project cards & recent activity
- **Layout:**
  - Project card grid (status-colored)
  - Pending approvals section
  - Recent documents list
  - Activity feed

#### EnhancedAnalyticsDashboard (Bottom)
- **Purpose:** Data visualization & insights
- **Layout:**
  - Chart grid (project trends, budget status, timeline progress)
  - Communication metrics
  - Document summary

---

### 2. PROJECTS TAB

**Route:** `/clientportal?tab=projects`  
**Components:** Project list + Task Management

#### ProjectDetailsCard
- **Purpose:** Show current/primary project details
- **Displays:**
  - Project name, number, status
  - Budget progress bar
  - Timeline
  - Team members
  - Quick action buttons

#### ProjectsHubModule
- **Purpose:** Full project list & detail views
- **Features:**
  - Project card grid (filterable)
  - Project detail drawer
  - Milestone timeline
  - Change order list
  - Document browser
  - Proposal status

#### TaskManagementPanel (NEW)
- **Purpose:** Kanban-style task management
- **Layout:** 4-column kanban board
  - **Column 1: Not Started**
    - Unstarted tasks
    - Task cards show: name, priority badge, assignees, due date, progress bar
  - **Column 2: In Progress**
    - Active tasks
    - Inline status dropdown
  - **Column 3: Completed**
    - Finished tasks (strike-through)
  - **Column 4: Blocked**
    - Blocked tasks (alert badge)

- **Interactions:**
  - Drag/drop task between columns
  - Click card to edit modal
  - Change status dropdown
  - Edit/delete buttons
  - Click to expand task details

---

### 3. COMMUNICATIONS TAB

**Route:** `/clientportal?tab=communications`  
**Component:** EnhancedCommunicationHub

**Layout:** 2-column (project list + message thread)

#### Left Column: Project Selector
- Scrollable list of projects
- Click to select active project
- Unread message count badge

#### Right Column: Message Thread
- **Header:**
  - Project name
  - Message count
  - Search bar
  - Export button (optional)

- **Message Area:**
  - Threaded messages (nested replies indented)
  - Message cards show:
    - Avatar + sender name + role badge + timestamp
    - Message content
    - Attached files (download links)
    - @mentions (highlighted)
    - Read receipts (checkmarks)
    - Reply button

- **Composer (Bottom):**
  - Text input with @mention autocomplete
  - File attachment button
  - Send button
  - Mention tags display above composer
  - Attachment previews

---

### 4. INVOICES TAB

**Route:** `/clientportal?tab=invoices`  
**Component:** ClientInvoices

**Layout:** Cards + List

- **Summary Cards:**
  - Total invoices (count)
  - Amount due
  - Amount paid

- **Invoice List:**
  - Table or card grid
  - Columns: Invoice #, Amount, Status badge, Due date, Actions
  - Row actions:
    - View/Download PDF
    - Pay button (redirects to Stripe)
    - Details expand

---

### 5. REPORTS TAB

**Route:** `/clientportal?tab=reports`  
**Component:** AdvancedClientReporting

**Layout:** Filter header + metric cards + chart grid

#### Filter Panel (Sticky top)
- Date range dropdown (Last 7 days, 30 days, 3 months, this month, custom)
- Project multi-select
- Status filter dropdown
- Export format selector (PDF/CSV)
- Export button

#### Metric Cards (4 cards)
- **Total Projects:** count + active count
- **Budget Utilization:** percentage + $spent / $budget
- **Avg Progress:** percentage
- **Milestones:** completed / total + percentage

#### Chart Section (2x2 grid)
- **Top-left:** Project Status Distribution (pie chart)
- **Top-right:** Budget Spending Trend (area chart)
- **Bottom-left:** Project Progress (horizontal bar chart)
- **Bottom-right:** Communication Activity (line chart)

---

### 6. PROFILE TAB

**Route:** `/clientportal?tab=profile`  
**Component:** 3 sub-tabs

#### Account Settings
- Company name (text input)
- Phone (tel input)
- Contact preference (radio buttons: email/phone/teams)
- Save button

#### Team Management
- Team member list
- Add member button
- Remove member button
- Role assignment

#### Workflow Settings
- Workflow rule builder
- Automation configuration
- Notification preferences

---

## MODAL & FLOATING COMPONENTS

### EnhancedClientOnboarding (Modal)
- **Trigger:** First-time user login
- **Steps:** 6-step wizard with progress bar
- **Navigation:** Back/Next buttons, step counter

### NotificationPreferences (Modal)
- **Trigger:** Settings icon (top right)
- **Content:** Notification event toggles
- **Channels:** Email, SMS, In-App

### AIAssistant (Floating Widget)
- **Position:** Bottom-right corner
- **Features:** Chat interface, file upload, AI suggestions

---

## COMPONENT TREE (Detailed)

```
ClientPortal
├── Header (blue gradient background)
│   ├── Logo + title
│   ├── Welcome message
│   └── Right actions
│       ├── NotificationBell
│       │   └── NotificationFeed (dropdown)
│       ├── Settings button
│       │   └── NotificationPreferences (modal)
│       └── Profile button
│
├── Stats Grid (4 cards, below header)
│   ├── Total Projects card
│   ├── Active Projects card
│   ├── Completed Projects card
│   └── Pending Review card
│
├── Tabs Navigation (6 tabs)
│   ├── Dashboard
│   ├── Projects
│   ├── Communications
│   ├── Invoices
│   ├── Reports
│   └── Profile
│
├── Tab Content Area
│   └── [Dynamic based on selected tab]
│
├── Floating Elements
│   ├── AIAssistant (bottom-right)
│   └── ToastNotifications (top-right, stacking)
│
└── Modal Overlays (conditional)
    ├── EnhancedClientOnboarding
    ├── NotificationPreferences
    └── [Other modals per tab]
```

---

## STYLING & THEME

**Color Palette:**
- Primary: Blue (#3b82f6)
- Secondary: Cyan (#0891b2)
- Accent: Teal (#14b8a6)
- Background: Gradient (gray-50 → blue-50 → cyan-50)
- Text: Neutral gray (#1f2937 to #f3f4f6)

**Typography:**
- Headings: Bold, sans-serif (2xl-4xl)
- Body: Regular sans-serif (sm-base)
- Data: Monospace (numbers/IDs)

**Spacing:**
- Base unit: 4px (Tailwind)
- Cards: 6px padding, 12px gap
- Sections: 20px-30px padding

**Responsive Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## DATA FLOW

```
User Authentication
↓
Fetch User Profile (base44.auth.me)
↓
Check onboarding_complete flag
├─ If false: Show EnhancedClientOnboarding modal
└─ If true: Load ClientPortal
    ↓
    Fetch Projects (filter by client_email)
    ├→ Fetch Milestones (for each project)
    ├→ Fetch Tasks (for each project)
    ├→ Fetch Invoices (for each project)
    ├→ Fetch Messages (for each project)
    └→ Fetch Documents (for each project)
    ↓
    Render tabs with data
    ↓
    Real-time subscriptions:
    ├─ ConversationMessage.subscribe()
    ├─ ProjectTask.subscribe()
    ├─ Notification.subscribe()
    └─ Invoice.subscribe()
    ↓
    Display live updates (no page reload needed)
```

---

## KEY FEATURES BY TAB

| Tab | Main Feature | CRUD Operations | Real-time? | Export? |
|-----|--------------|-----------------|-----------|---------|
| Dashboard | Metrics overview | Read-only | ✅ | ❌ |
| Projects | Task management | Create, Update, Delete | ✅ | ❌ |
| Communications | Threaded messaging | Create, Read, Delete | ✅ | ❌ |
| Invoices | Payment tracking | Read, Download | ✅ | ✅ PDF |
| Reports | Data visualization | Read, Filter | ✅ | ✅ CSV/PDF |
| Profile | Settings | Update | ❌ | ❌ |

---

## RESPONSIVE BEHAVIOR

**Mobile (< 640px):**
- Hamburger menu (tabs collapse to dropdown)
- Stats grid: 1 column
- Charts: Single-column, scrollable
- Cards: Full-width stacking

**Tablet (640px - 1024px):**
- Tabs remain visible
- Stats grid: 2 columns
- Charts: 2-column grid
- Sidebar becomes drawer

**Desktop (> 1024px):**
- Full 6-tab navigation
- Stats grid: 4 columns
- Charts: 2x2 grid
- Optimal spacing

---

## ACCESSIBILITY

- **Keyboard Navigation:** Tab order through forms, Enter/Space for buttons, Escape closes modals
- **ARIA Labels:** All buttons, form fields, and interactive elements
- **Focus Indicators:** Visible outline on focused elements
- **Color Contrast:** WCAG AA compliant (4.5:1 text ratio)
- **Screen Reader Support:** Semantic HTML, alt text on images

---

## TESTING CHECKLIST

- [ ] All tabs load data correctly
- [ ] Real-time updates appear without page refresh
- [ ] Modals open/close properly
- [ ] Form validation works
- [ ] File uploads succeed
- [ ] Charts render on all viewport sizes
- [ ] Keyboard navigation works
- [ ] Mobile layout responsive

---

## DEPLOYMENT NOTES

**For Replit/Node.js migration:**
1. Replace `base44.auth.me()` with NextAuth session
2. Replace `base44.entities.*` with Prisma queries
3. Update WebSocket connection for real-time (socket.io or Liveblocks)
4. Ensure env vars match new stack (.env.local)
5. Test all tabs in development environment before production push

---

## CONTACT & QUESTIONS

For questions about specific components or layouts, refer to:
- Component files: `components/portal/` 
- Page file: `pages/ClientPortal.jsx`
- Type definitions: `components/types/models.ts