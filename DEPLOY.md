# Deploying DiskiTrack (live public URL)

This guide gets a public demo/portfolio URL using:

- **Render** — backend API (Express + Socket.io) **and** the PostgreSQL database
- **Vercel** — frontend (React + Vite SPA)

Everything needed is already in the repo:

- `render.yaml` — Render Blueprint (web service + managed Postgres)
- `backend/src/scripts/setupDb.js` — one-shot DB bootstrap (`npm run setup-db`)
- `frontend/vercel.json` — SPA routing config for Vercel

---

## 0. Prerequisites

- Code pushed to GitHub (already done).
- Free accounts on [Render](https://render.com) and [Vercel](https://vercel.com).

---

## 1. Deploy backend + database on Render

1. Render Dashboard → **New** → **Blueprint**.
2. Select this GitHub repo. Render reads `render.yaml` and proposes:
   - `diskitrack-db` (PostgreSQL, free)
   - `diskitrack-api` (Node web service, free)
3. Click **Apply**. `JWT_SECRET` and `JWT_REFRESH_SECRET` are auto-generated;
   `DATABASE_URL` is wired automatically from the database.
4. Wait for the first deploy to finish (the API will be live but the DB is empty).

### Initialize the database (one time)

1. Open the `diskitrack-api` service → **Shell** tab.
2. Run:
   ```bash
   npm run setup-db
   ```
   This applies `schema.sql` and seeds demo data (skip with `SKIP_SEED=true`).

Your backend is now live at something like:
`https://diskitrack-api.onrender.com`

> Verify: open `https://diskitrack-api.onrender.com/health` → `{"status":"ok"}`

> Note: free Render services sleep when idle; the first request after a while
> takes ~30–60s to wake. Fine for a demo/portfolio.

---

## 2. Deploy frontend on Vercel

1. Vercel Dashboard → **Add New** → **Project** → import this repo.
2. Set **Root Directory** to `frontend`.
3. Framework preset: **Vite** (auto-detected via `vercel.json`).
4. Add **Environment Variables** (point to the Render backend):
   | Name | Value |
   |------|-------|
   | `VITE_API_URL` | `https://diskitrack-api.onrender.com/api` |
   | `VITE_SOCKET_URL` | `https://diskitrack-api.onrender.com` |
5. Click **Deploy**.

Your frontend is now live at something like:
`https://diskitrack.vercel.app`

---

## 3. Connect the two (CORS)

1. Back in Render → `diskitrack-api` → **Environment**.
2. Set `CLIENT_ORIGIN` to your Vercel URL, e.g. `https://diskitrack.vercel.app`
   (no trailing slash).
3. Save → the service redeploys. This allows the browser and Socket.io to talk
   to the API.

---

## 4. Verify end-to-end

1. Open the Vercel URL.
2. Log in with a seeded demo account:
   - System Admin: `admin@diskitrack.io` / `password123`
   - Club Admin: `clubadmin@soweto.fc` / `password123`
   - Coach: `coach@soweto.fc` / `password123`
3. Confirm dashboards, charts, and live features load.

---

## Notes & limitations (free tier)

- **Uploaded videos** are saved to the backend's local `uploads/` folder. On
  Render's free tier this disk is **ephemeral** — files are lost on redeploy.
  For a portfolio demo, prefer **YouTube links** for video tagging. Persistent
  storage (e.g. S3/Cloudinary) would be a future enhancement.
- Re-running `npm run setup-db` is safe: the schema is idempotent and the seed
  is skipped if users already exist.

## Environment variable reference

**Backend (Render):**
- `DATABASE_URL` (auto from Render DB), `NODE_ENV=production`
- `JWT_SECRET`, `JWT_REFRESH_SECRET` (auto-generated)
- `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- `CLIENT_ORIGIN` = your Vercel URL

**Frontend (Vercel):**
- `VITE_API_URL` = `<render-backend>/api`
- `VITE_SOCKET_URL` = `<render-backend>`
