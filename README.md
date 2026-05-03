# BESS Ops Portal

Battery Energy Storage System (BESS) Asset Operations & Maintenance Management Portal — IIT Madras App Dev Lab Capstone (Jan 2026).

A full-stack web application for managing BESS assets, technician assignments, maintenance logs, and automated alerts across multiple sites.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20, Express 5, TypeScript, TypeORM |
| Database | SQLite (development) / PostgreSQL (production) |
| Auth | JWT (stateless, 12h expiry), RBAC middleware |
| Frontend | React 18, Vite, Recharts |
| File Upload | Multer (images, 5 MB limit) |

---

## Architecture

```
client/          React 18 + Vite SPA
  src/
    components/  AdminDashboard, AssetManagerDashboard, TechnicianDashboard
    services/    api.js — Axios instance (auto JWT header)
    App.jsx      Login + role-based routing

server/          Express 5 REST API
  src/
    entities/    BESSAsset, MaintenanceLog, Alert, User, AssetTechnicianAssignment
    services/    AssetService, MaintenanceLogService, AlertService, StatsService, UserService
    controllers/ per-entity controllers
    middlewares/ auth.middleware (JWT verify), rbac.middleware (role guard)
    routes/      /auth, /assets, /alerts, /users, /stats
uploads/         Multer disk storage (site images)
```

---

## Setup & Running Locally

### Prerequisites
- Node.js >= 18
- npm

### 1. Backend

```bash
cd server
npm install
cp .env.example .env   # already pre-filled for SQLite dev
npm run dev            # starts on http://localhost:5000
```

### 2. Frontend

```bash
cd client
npm install
npm run dev            # starts on http://localhost:5173
```

Open http://localhost:5173 in your browser.

> See `RUN_AND_LOGIN.txt` for full credentials and quick-start commands.

---

## Test Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@bess.com | Admin@123 |
| Asset Manager | manager1@bess.com | Manager1@bess |
| Technician | arjun.tech@bess.com | Arjun@bess1 |

---

## Features by Role

### Admin
- View all assets with search, filters (status / category / date range), sorting, and pagination
- Manage all users — promote role, activate / deactivate accounts
- View and filter all alerts globally (severity, status, date range)
- Analytics tab:
  - Asset status pie chart and monthly registration bar chart
  - Alert trends line chart (last 30 days, by severity)
  - SoH portfolio heatmap (all assets ranked by State of Health)
- Recent activity feed (logs, alerts, user registrations)

### Asset Manager
- Register and manage own BESS assets (GRID_SCALE / COMMERCIAL / RESIDENTIAL)
- Upload site images per asset
- Assign / unassign field technicians to assets
- Raise, acknowledge, and resolve alerts on own assets
- Filter maintenance logs by type and date range
- Portfolio average SoH shown in sidebar
- Per-asset SoH health bar on asset cards

### Technician
- View assigned assets only
- Submit maintenance logs (logType, SoH%, temperature, notes, visitedAt)
- Raise alerts from the field
- Assignment guard — log requests rejected if not assigned to that asset

---

## Business Rules

| Rule | Behaviour |
|---|---|
| SoH < 20% | Auto-raises **CRITICAL** alert; flips asset to `UNDER_MAINTENANCE` |
| SoH < 40% | Auto-raises **WARNING** alert |
| Active status guard | Cannot set asset to `ACTIVE` while a Critical alert is OPEN or ACKNOWLEDGED |
| Assignment guard | Technician's log/alert request rejected (403) if not assigned to that asset |
| Ownership guard | Asset Manager can only update alerts on their own assets (403 otherwise) |
| Deactivation guard | Deactivated users cannot log in |

---

## API Endpoints (summary)

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/assets                                   (all roles, with search/filter/sort/pagination)
POST   /api/assets                                   (ASSET_MANAGER)
PATCH  /api/assets/:id/status                        (ADMIN, ASSET_MANAGER)
POST   /api/assets/:id/image                         (ASSET_MANAGER)

GET    /api/assets/:id/assignments                   (ADMIN, ASSET_MANAGER)
POST   /api/assets/:id/assignments                   (ADMIN, ASSET_MANAGER)
DELETE /api/assets/:id/assignments/:techId           (ADMIN, ASSET_MANAGER)

GET    /api/assets/:id/maintenance-logs              (all roles, with logType/date filters)
POST   /api/assets/:id/maintenance-logs              (TECHNICIAN)
GET    /api/assets/:id/maintenance-logs/soh-trend    (ADMIN, ASSET_MANAGER)

GET    /api/assets/:id/alerts                        (all roles)
POST   /api/assets/:id/alerts                        (all roles)
GET    /api/alerts                                   (ADMIN, with severity/status/date filters)
PATCH  /api/alerts/:id                               (ADMIN, ASSET_MANAGER)

GET    /api/users                                    (ADMIN, ASSET_MANAGER)
PATCH  /api/users/:id/role                           (ADMIN)
PATCH  /api/users/:id/active                         (ADMIN — toggle active/inactive)

GET    /api/stats                                    (ADMIN)
GET    /api/stats/manager                            (ASSET_MANAGER)
GET    /api/stats/alert-trends                       (ADMIN)
GET    /api/stats/soh-overview                       (ADMIN)
```

---

## HTTP Error Contract

| Code | Meaning |
|---|---|
| 400 | Validation failure |
| 401 | Missing or invalid JWT |
| 403 | Authenticated but not authorized (wrong role or ownership) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email on register, duplicate technician assignment) |

---

## Database Entities

- **BESSAsset** — name, siteName, category, capacityKwh, status, imageUrl, installationDate, owner (→ User)
- **MaintenanceLog** — logType, description, stateOfHealthPercent (0–100), temperatureCelsius, notes, visitedAt, technician (→ User), asset (→ BESSAsset)
- **Alert** — title, severity, status, description, raisedAt, resolvedAt, raisedBy (→ User), asset (→ BESSAsset)
- **AssetTechnicianAssignment** — asset (→ BESSAsset), technician (→ User) [unique constraint]
- **User** — fullName, email, passwordHash, role, isActive
