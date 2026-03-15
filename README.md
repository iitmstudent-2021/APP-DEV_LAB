# BESS Fullstack App

Initial development scaffold for the App Dev Lab capstone project.

## Structure

- client: React + Vite frontend
- server: Express + TypeORM + PostgreSQL backend

## Backend Setup

1. Copy server/.env.example to server/.env and update values.
2. Ensure PostgreSQL is running and the configured database exists.
3. Start backend:

```bash
cd server
npm install
npm run dev
```

Backend base URL: http://localhost:5000/api

## Frontend Setup

```bash
cd client
npm install
npm run dev
```

Frontend URL: http://localhost:5173

## Available Starter APIs

- GET /api/health
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- GET /api/assets
- POST /api/assets (Asset Manager only)

## Roles

- ADMIN
- ASSET_MANAGER
- TECHNICIAN

## Next Development Milestones

1. Add MaintenanceLog and Alert CRUD APIs.
2. Implement business rules:
   - Critical alert -> asset status under maintenance.
   - Health threshold auto-alert.
   - Assignment guard for technician logging.
3. Add pagination/filtering/sorting params to list endpoints.
4. Add role-specific dashboard pages.
5. Add tests and migration strategy.
