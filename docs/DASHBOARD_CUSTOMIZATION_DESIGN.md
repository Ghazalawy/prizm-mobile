# Role-Based Dashboard Customization — Design Document

> Status: **Design Phase** (implementation starts after v1.8.0 stabilization)

## Problem Statement

The current dashboard shows the same widgets to all users, gated only by Perfex
permissions. This means:

- A developer sees leads/opportunities/project stats that are irrelevant to their work
- A BD manager sees HR self-service widgets that clutter their view
- There is no way for an admin to configure what each role/department sees
- Users cannot override the default to pin what matters to them

## Goals

1. Each user's dashboard shows only the widgets relevant to their job function
2. An admin can design dashboard layouts per Department or Job Position
3. Individual staff can override their role-default if needed
4. New modules automatically get a widget entry in the registry
5. Both WebUI and Mobile app dashboards use the same resolution chain

---

## Architecture

### Data Model (Backend — prizm331)

Three new tables in the Perfex database:

#### `tbldashboard_widgets` — Widget Catalog

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT AUTO_INCREMENT | PK |
| `widget_key` | VARCHAR(80) UNIQUE | e.g. `tasks_summary`, `projects_count` |
| `title` | VARCHAR(255) | Human-readable name |
| `description` | TEXT | What this widget shows |
| `icon` | VARCHAR(50) | Ionicons name |
| `component_type` | ENUM('stat','chart','list','action') | Rendering hint |
| `default_size` | ENUM('1x1','2x1','1x2','2x2') | Grid footprint |
| `permission_feature` | VARCHAR(80) NULL | Perfex permission key (null = always visible) |
| `module` | VARCHAR(80) | Source module (e.g. `tasks`, `projects`, `hr`) |
| `is_active` | TINYINT(1) DEFAULT 1 | Soft-disable without deleting |
| `sort_order` | INT DEFAULT 0 | Default ordering in the palette |

#### `tbldashboard_profiles` — Role/Department Layouts

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT AUTO_INCREMENT | PK |
| `name` | VARCHAR(255) | Profile name (e.g. "BD Department Dashboard") |
| `job_position_id` | INT NULL | FK to `tblstaff_job_positions.id` |
| `department_id` | INT NULL | FK to `tbldepartments.departmentid` |
| `layout_json` | LONGTEXT | JSON array of `{ widget_key, position, size }` |
| `created_by` | INT | Staff who created this profile |
| `updated_at` | DATETIME | Last modification |

Constraint: exactly one of `job_position_id` or `department_id` must be non-null.

#### `tbldashboard_overrides` — Per-Staff Overrides

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT AUTO_INCREMENT | PK |
| `staffid` | INT UNIQUE | FK to `tblstaff.staffid` |
| `layout_json` | LONGTEXT | JSON array of `{ widget_key, position, size }` |
| `updated_at` | DATETIME | Last modification |

### Resolution Chain

When a user loads the dashboard, the backend resolves their layout in this order:

```
1. Staff override   → tbldashboard_overrides WHERE staffid = ?
2. Job position     → tbldashboard_profiles  WHERE job_position_id = staff.job_position
3. Department       → tbldashboard_profiles  WHERE department_id = staff.department_id
4. System default   → hardcoded DEFAULT_LAYOUT constant
```

First match wins. The `layout_json` is a JSON array:

```json
[
  { "widget_key": "tasks_summary",    "col": 0, "row": 0, "w": 2, "h": 1 },
  { "widget_key": "approvals_pending","col": 0, "row": 1, "w": 1, "h": 1 },
  { "widget_key": "projects_active",  "col": 1, "row": 1, "w": 1, "h": 1 }
]
```

### Widget Registry (Frontend)

Each widget is a self-contained React component registered in a central map:

```typescript
type WidgetDef = {
  key: string;
  title: string;
  icon: string;
  component: React.ComponentType<{ size: WidgetSize }>;
  queryHook: () => { data: any; isLoading: boolean };
  permissionFeature?: string;
  sizes: WidgetSize[];  // which sizes this widget supports
};

const WIDGET_REGISTRY: Record<string, WidgetDef> = {
  tasks_summary:     { ... },
  projects_count:    { ... },
  approvals_pending: { ... },
  invoices_overdue:  { ... },
  // new module → add entry here
};
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/profile` | Returns resolved layout for the current user |
| GET | `/api/dashboard/widgets` | Lists all active widgets (for admin palette) |
| PUT | `/api/dashboard/profile` | Save a profile (admin: by dept/job; user: personal override) |
| DELETE | `/api/dashboard/override/{staffid}` | Remove personal override (revert to role default) |

---

## Admin Workbench Screen

### Mobile Route

`/(tabs)/dashboard-workbench`

### Layout

```
┌──────────────────────────────────────────┐
│  ← Dashboard Workbench        [Save]     │
├──────────────────────────────────────────┤
│  [Department ▼]  [Job Position ▼]        │
│  ─ or ─                                  │
│  [Specific Staff: ___________]           │
├──────────────────────────────────────────┤
│                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │ Tasks   │ │ Approvals│ │         │    │
│  │ Summary │ │ Pending  │ │  Empty  │    │
│  │ (2x1)   │ │ (1x1)   │ │  Slot   │    │
│  └─────────┘ └─────────┘ └─────────┘    │
│  ┌─────────┐ ┌─────────────────────┐    │
│  │Projects │ │   Invoices Overdue   │    │
│  │ Active  │ │       (2x1)         │    │
│  │ (1x1)   │ │                     │    │
│  └─────────┘ └─────────────────────┘    │
│                                          │
├──────────────────────────────────────────┤
│  Widget Palette (drag onto grid above)   │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐    │
│  │ T  │ │ P  │ │ A  │ │ I  │ │ HR │    │
│  └────┘ └────┘ └────┘ └────┘ └────┘    │
└──────────────────────────────────────────┘
```

### Interactions

- **Select scope**: Pick a department, job position, or specific staff member
- **Drag widgets** from the palette onto the grid canvas
- **Resize** by dragging the bottom-right handle (snaps to 1x1, 2x1, 1x2, 2x2)
- **Remove** by dragging off the canvas or tapping the X overlay
- **Preview toggle**: Switch between "Mobile" and "Web" preview columns
- **Save**: POST to `/api/dashboard/profile` with the scope and layout JSON

---

## Implementation Phases

### Phase 1 — Stabilization + Widget Registry (this sprint)

- [x] Fix all v1.8.0 regressions
- [ ] Refactor `lib/dashboard-layout.ts` to use a widget registry pattern
- [ ] Define `WIDGET_REGISTRY` with all current dashboard cards
- [ ] Each card reads its data from the registry's `queryHook`
- [ ] Existing "Customize" screen uses the registry for show/hide

### Phase 2 — Backend API + Resolution Chain (next sprint)

- [ ] Create the 3 database tables in prizm331
- [ ] Build the REST API endpoints (GET/PUT profile, GET widgets)
- [ ] Implement the 4-level resolution chain
- [ ] Seed `tbldashboard_widgets` with all current widget definitions
- [ ] Mobile app fetches layout from API instead of local SecureStore
- [ ] Fallback: if API is unreachable, use cached local layout

### Phase 3 — Admin Workbench (sprint +2)

- [ ] Build the `/(tabs)/dashboard-workbench` screen
- [ ] Department/job position selector with staff list
- [ ] Drag-and-drop grid canvas (reuse `DraggableDashboardGrid` patterns)
- [ ] Widget palette with search and permission filtering
- [ ] Resize handles for grid items
- [ ] Save/load profiles via API
- [ ] Preview toggle for mobile vs web column widths
- [ ] WebUI: mirror the workbench as a PHP admin page (same API)

---

## Scalability

Adding a new module widget:

1. Create the widget component (e.g. `widgets/NewModuleWidget.tsx`)
2. Add the query hook to the widget
3. Register in `WIDGET_REGISTRY` with key, title, icon, sizes, permission
4. Insert a row into `tbldashboard_widgets` (migration or seed)
5. The widget appears in the admin palette automatically
6. Admin drags it onto the appropriate department/role dashboards

No code changes needed in the dashboard grid, resolution chain, or workbench.

---

## Open Questions

1. **WebUI parity**: Should the PHP admin dashboard also read from the same
   `tbldashboard_profiles` table? (Recommended: yes, via AJAX endpoint)
2. **Widget data caching**: Should the backend pre-aggregate widget data into
   a single payload, or should each widget fetch independently? (Recommended:
   independent fetches with React Query caching)
3. **Default profiles**: Should we ship pre-built profiles for common Prizm
   departments (BD, Finance, Operations, HR)? (Recommended: yes, as seeds)
