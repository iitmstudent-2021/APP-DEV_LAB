# BESS Ops Portal

Battery Energy Storage System (BESS) Asset Operations & Maintenance Management Portal — IIT Madras App Dev Lab Capstone (Jan 2026).

A full-stack web application for managing BESS assets, technician assignments, maintenance logs, and automated alerts across multiple sites.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20, Express 5, TypeScript, TypeORM |
| Database | SQLite (development) / PostgreSQL (production) |
| Auth | JWT (stateless), RBAC middleware |
| Frontend | React 18, Vite, Recharts |
| File Upload | Multer (images, 5 MB limit) |

---

## Architecture

```
client/          React 18 + Vite SPA
  src/
    components/  AdminDashboard, AssetManagerDashboard, TechnicianDashboard
    services/    api.ts — Axios instance (auto JWT header)
    App.jsx      Login + role-based routing

server/          Express 5 REST API
  src/
    entities/    BESSAsset, MaintenanceLog, Alert, User, AssetTechnicianAssignment
    services/    AssetService, MaintenanceLogService, AlertService, StatsService
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
npm run dev            # starts on http://localhost:3000
```

### 2. Frontend

```bash
cd client
npm install
npm run dev            # starts on http://localhost:5173
```

Open http://localhost:5173 in your browser.

---

## Test Credentials

| Role | Full Name | Email | Password |
|---|---|---|---|
| Admin | Alice Admin | alice@bess.com | Admin@bess1 |
| Asset Manager | Bob Manager | bob@bess.com | Manager@bess1 |
| Technician | Arjun Sharma | arjun.tech@bess.com | Arjun@bess1 |

> See `RUN_AND_LOGIN.txt` for full seeding instructions.

---

## Features by Role

### Admin
- View all assets with search, filters (status/category/date range), sorting, and pagination
- Analytics tab: asset status pie chart, monthly registration bar chart
- Recent activity feed (logs, alerts, user registrations)
- Manage all users (promote/deactivate)
- View and resolve all alerts globally

### Asset Manager
- Register and manage own BESS assets (GRID_SCALE / COMMERCIAL / RESIDENTIAL)
- Upload site images per asset
- Assign / unassign technicians to assets
- Raise and manage alerts (Acknowledge / Resolve)
- Safe status transition guard — cannot set asset to ACTIVE if unresolved Critical alerts exist
- Portfolio average SoH bar in sidebar
- Per-asset SoH health bar on asset cards

### Technician
- View assigned assets only
- Submit maintenance logs (logType, SoH%, temperature, notes, visitedAt)
- View last 5 maintenance logs per asset
- Raise alerts from the field
- Assignment guard — can only log on assigned assets

---

## Business Rules

| Rule | Behaviour |
|---|---|
| SoH < 20% | Auto-raises **CRITICAL** alert; flips asset to `UNDER_MAINTENANCE` |
| SoH < 40% | Auto-raises **WARNING** alert |
| Active status guard | Cannot set asset to `ACTIVE` while Critical alert is OPEN or ACKNOWLEDGED |
| Assignment guard | Technician's log request rejected if not assigned to that asset |

---

## API Endpoints (summary)

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/assets                          (all roles)
POST   /api/assets                          (ASSET_MANAGER)
PATCH  /api/assets/:id/status               (ADMIN, ASSET_MANAGER)
POST   /api/assets/:id/image                (ASSET_MANAGER)

GET    /api/assets/:id/assignments          (ADMIN, ASSET_MANAGER)
POST   /api/assets/:id/assignments          (ADMIN, ASSET_MANAGER)
DELETE /api/assets/:id/assignments/:techId  (ADMIN, ASSET_MANAGER)

GET    /api/assets/:id/maintenance-logs     (all roles)
POST   /api/assets/:id/maintenance-logs     (TECHNICIAN)
GET    /api/assets/:id/maintenance-logs/soh-trend  (ADMIN, ASSET_MANAGER)

GET    /api/assets/:id/alerts               (all roles)
POST   /api/assets/:id/alerts               (all roles)
GET    /api/alerts                          (ADMIN)
PATCH  /api/alerts/:id                      (ADMIN, ASSET_MANAGER)

GET    /api/users                           (ADMIN)
PATCH  /api/users/:id/role                  (ADMIN)

GET    /api/stats                           (ADMIN)
GET    /api/stats/manager                   (ASSET_MANAGER)
```

---

## Database Entities

- **BESSAsset** — name, siteName, category, capacityKwh, status, imageUrl, owner (→ User)
- **MaintenanceLog** — logType, description, stateOfHealthPercent, temperatureCelsius, visitedAt, technician (→ User), asset (→ BESSAsset)
- **Alert** — title, severity, status, description, raisedAt, raisedBy (→ User), asset (→ BESSAsset)
- **AssetTechnicianAssignment** — asset (→ BESSAsset), technician (→ User)
- **User** — fullName, email, passwordHash, role (ADMIN | ASSET_MANAGER | TECHNICIAN)
