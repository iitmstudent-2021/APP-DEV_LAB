# BESS Ops Portal

Battery Energy Storage System (BESS) Asset Operations & Maintenance Management Portal — IIT Madras App Dev Lab Capstone (Jan 2026).

A full-stack web application for managing BESS assets, technician assignments, maintenance logs, and automated alerts across multiple sites.

---

## Live Demo

| Service | URL |
|---|---|
| **Frontend (App)** | https://bess-portal-frontend.onrender.com |
| **Backend API** | https://bess-portal-backend.onrender.com/api |

> The free-tier backend spins down after inactivity. First request may take **30–60 seconds** to wake up — wait and retry if the login hangs.

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@bess.com | Admin@123 |
| Asset Manager | manager1@bess.com | Manager1@bess |
| Technician | arjun.tech@bess.com | Arjun@bess1 |

---

## How to Use the App

### Golden Path (full demo flow)

```
Admin creates users → Manager creates assets & assigns technicians
→ Technician logs maintenance (triggers auto-alerts)
→ Manager acknowledges / resolves alerts → cycle repeats
```

### Step-by-step

**1. Login as Admin**
- Go to https://bess-portal-frontend.onrender.com
- Login with `admin@bess.com` / `Admin@123`
- Admin dashboard shows global analytics: asset status, alert trends, SoH heatmap

**2. Login as Asset Manager**
- Login with `manager1@bess.com` / `Manager1@bess`
- Click **Add Asset** to register a BESS unit (name, site, category, capacity)
- Upload a site image for the asset
- Go to the asset → **Assignments** → assign a technician

**3. Login as Technician**
- Login with `arjun.tech@bess.com` / `Arjun@bess1`
- Only assigned assets are visible
- Click an asset → **Submit Maintenance Log**
  - Set SoH below 20% to trigger an automatic **CRITICAL** alert and flip status to `UNDER_MAINTENANCE`
  - Set SoH below 40% to trigger an automatic **WARNING** alert

**4. Back as Manager — handle alerts**
- Go to the asset → **Alerts** tab
- Click **Acknowledge** on an open alert (status: OPEN → ACKNOWLEDGED)
- Click **Resolve** once fixed (status: ACKNOWLEDGED → RESOLVED)
- A resolved critical alert unlocks the ability to set the asset back to `ACTIVE`

**5. Admin analytics**
- Switch to Admin → **Analytics** tab to see:
  - Asset status distribution (pie chart)
  - Monthly asset registrations (bar chart)
  - Alert trends last 30 days (line chart by severity)
  - SoH portfolio heatmap (all assets ranked by health)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Recharts |
| Backend | Node.js 20, Express 5, TypeScript, TypeORM |
| Database | Neon PostgreSQL (cloud, AWS Singapore) |
| Auth | JWT (stateless, 12h expiry), RBAC middleware |
| File Upload | Multer (images, 5 MB limit) |
| Deployment | Render.com (Web Service + Static Site) |

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

## Running Locally

### Prerequisites
- Node.js >= 18
- npm

### 1. Backend

```bash
cd server
npm install
cp .env.example .env   # edit DB_TYPE=sqlite for local SQLite dev
npm run dev            # starts on http://localhost:5000
```

### 2. Frontend

```bash
cd client
npm install
npm run dev            # starts on http://localhost:5173
```

Open http://localhost:5173 in your browser.

> See `RUN_AND_LOGIN.txt` for full credentials and sample data for demos.

---

## Deployment

The app is deployed on **Render.com**:

| Service | Type | Platform |
|---|---|---|
| `bess-portal-backend` | Web Service (Node) | Render Free |
| `bess-portal-frontend` | Static Site | Render Free |
| Database | PostgreSQL | Neon.tech (AWS Singapore) |

**Backend build command:** `npm install --include=dev && npm run build`
**Backend start command:** `node dist/server.js`
**Frontend build command:** `npm install && npm run build`
**Frontend publish directory:** `dist`

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

## API Endpoints

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
