# DiskiTrack

Production-grade multi-tenant SaaS for football (soccer) analytics and live match tracking, supporting clubs from U13 to senior level (Boys, Girls, Men, Women).

## Stack
- **Frontend:** React 18 + Material UI v5 (Vite)
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (UUID PKs, multi-tenant)
- **Real-time:** Socket.io
- **Auth:** JWT with role-based access control (RBAC)

## Monorepo layout
```
DiskiTrack/
├── backend/      # Express REST API + Socket.io
├── frontend/     # React + MUI client
└── README.md
```

## Roles
`SYSTEM_ADMIN`, `CLUB_ADMIN`, `COACH`, `ANALYST`, `GUARDIAN`

## Multi-tenancy
Every table carries `tenant_id` (the club id). `SYSTEM_ADMIN` can cross tenants; every
other role is scoped to its own `tenant_id` through the tenant-isolation middleware.

## Getting started

### 1. Database
```bash
createdb diskitrack
psql -d diskitrack -f backend/src/db/schema.sql
psql -d diskitrack -f backend/src/db/seed.sql   # optional demo data
```

### 2. Backend
```bash
cd backend
cp .env.example .env      # fill in DB + JWT secrets
npm install
npm run dev               # http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

## Theme
Blue primary buttons on a white surface — large, touch-friendly controls on the Live Match screen.
