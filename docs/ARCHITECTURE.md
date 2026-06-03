# DiskiTrack — System Architecture

> Multi-tenant SaaS for football clubs: player management, contracts, live match
> tracking, safeguarding (guardians/minors), club messaging, and analytics.
> Prepared for internal architecture review (pre-finance engagement).

---

## 1. Executive Summary

DiskiTrack replaces spreadsheets and WhatsApp groups for football clubs with a
single, secure, subscription-based platform. It is **multi-tenant**: many clubs
share one deployment, but each club's data is hard-isolated. The system is built
as a classic three-tier web application (React SPA → REST/WebSocket API →
PostgreSQL) and is cloud-deployed (Vercel + Render).

**Why this matters for finance:** one codebase serves unlimited clubs. Revenue
scales with subscriptions while marginal cost per club is near-zero. Plan tiers
(Free / Starter / Pro / Enterprise) and usage limits are now enforced in code.

---

## 2. High-Level Architecture

```
					┌──────────────────────────────────────────────┐
					│                  CLIENTS                       │
					│  Desktop (analytics)  Tablet (match control)   │
					│            Mobile (coach on field)             │
					└───────────────┬──────────────────────────────┘
									│ HTTPS / WSS
									▼
		┌───────────────────────────────────────────────────────────┐
		│  FRONTEND  —  React 18 + Vite + Material UI  (Vercel CDN)  │
		│  • Role-aware SPA   • Context providers (Auth,             │
		│    Notifications, Announcements)   • Axios API client      │
		└───────────────┬───────────────────────────┬───────────────┘
						│ REST (JSON)                │ Socket.IO
						▼                            ▼
		┌───────────────────────────────────────────────────────────┐
		│  BACKEND  —  Node.js + Express  (Render web service)       │
		│                                                            │
		│  Middleware pipeline:                                       │
		│   helmet → CORS → rate-limit → JSON → auth(JWT) →          │
		│   tenantIsolation → authorize(RBAC) → planLimit            │
		│                                                            │
		│  Domain controllers: clubs, users, teams, players,         │
		│   matches, analytics, standings, training, messaging,      │
		│   call-ups, billing, notifications, privacy, audit         │
		│                                                            │
		│  Cross-cutting utils: audit log, notify, mailer (SMTP),    │
		│   payment gateway (pluggable), tokens                      │
		└───────────────┬───────────────────────────┬───────────────┘
						│                            │
						▼                            ▼
		┌──────────────────────────┐    ┌───────────────────────────┐
		│  PostgreSQL (Render)     │    │  External services         │
		│  • tenant_id on every    │    │  • SMTP (transactional     │
		│    domain table          │    │    email)                  │
		│  • idempotent migrations │    │  • Payment gateway          │
		│    run on boot           │    │    (PayFast/Paystack/Stripe│
		│                          │    │    — pluggable, stubbed)   │
		└──────────────────────────┘    └───────────────────────────┘
```

---

## 3. Technology Stack

| Layer        | Technology                              | Why                                  |
|--------------|-----------------------------------------|--------------------------------------|
| Frontend     | React 18, Vite, Material UI v5          | Fast, responsive, component-rich     |
| Realtime     | Socket.IO (client + server)             | Live match + in-app notifications    |
| Backend      | Node.js, Express 4                      | Lightweight, fast to iterate         |
| Validation   | Zod schemas                             | Type-safe request validation         |
| Auth         | JWT (access + refresh), bcrypt          | Stateless, horizontally scalable     |
| Database     | PostgreSQL (UUID PKs, JSONB)            | Relational integrity + flexibility   |
| Email        | Nodemailer (SMTP)                       | Invites, resets, approvals, alerts   |
| Hosting      | Vercel (frontend), Render (API + DB)    | Managed, CI/CD, scalable             |
| Testing      | Vitest + Supertest                      | Unit + integration tests             |

---

## 4. Multi-Tenancy & Security Model

**Tenant isolation (the core guarantee):**
- Every domain table carries a `tenant_id` (the club).
- `tenantIsolation` middleware resolves the effective tenant on every request.
- Non-admin users are **hard-locked** to the tenant baked into their JWT; any
  cross-tenant header is rejected with 403.
- `SYSTEM_ADMIN` may operate across tenants (platform operator).

**Roles (RBAC):** `SYSTEM_ADMIN`, `CLUB_ADMIN`, `COACH`, `ANALYST`,
`GUARDIAN`, `PLAYER` — enforced by the `authorize()` middleware per route.

**Security hardening (this phase):**
- Account lockout: 5 failed logins → 15-minute temporary lock.
- Dedicated stricter rate limit on `/api/auth` (brute-force/credential-stuffing).
- General API rate limiting, Helmet headers, CORS allow-list.
- Full **audit log** of sensitive actions (logins, data exports, subscription
  changes, messaging) with actor, IP, and timestamp.

**Safeguarding (minors):**
- Players under 18 require a linked **guardian** at registration.
- Guardians sign in via their child's ID number, validated against club data.
- Document verification workflow on player documents.

---

## 5. Compliance (POPIA / GDPR)

| Capability            | Status   | Where                                |
|-----------------------|----------|--------------------------------------|
| Consent records       | ✅ added | `consent_records` table + API        |
| Self-service export   | ✅ added | `GET /privacy/export`                |
| Right to be forgotten | ✅ added | `data_requests` (admin-actioned)     |
| Audit trail           | ✅ added | `audit_log` table + admin viewer     |
| Tenant data isolation | ✅ core  | `tenant_id` + middleware             |

This is essential because the platform stores **minors' ID numbers and
documents** — a regulated category under POPIA (South Africa) and GDPR (EU).

---

## 6. Billing & Subscriptions (SaaS commercial engine)

```
   Plan catalogue (subscription_plans)
   ┌────────┬──────────┬───────┬─────────┐
   │ FREE   │ STARTER  │ PRO   │ ENTERPRISE
   │ R0     │ R499/mo  │ R999  │ R2 499  │   (ZAR, illustrative)
   │ 2 teams│ 6 teams  │ 20    │ ∞       │
   │ 40 plr │ 150 plr  │ 600   │ ∞       │
   └────────┴──────────┴───────┴─────────┘
			│
			▼
   club_subscriptions  (one active plan per club)
			│
			▼
   enforcePlanLimit middleware  →  blocks create when over limit (HTTP 402)
			│
			▼
   Payment gateway (pluggable)   →  manual (works now) | PayFast | Paystack | Stripe
			│
			▼
   billing_invoices  (ledger)
```

- **Plan gating is live**: creating a team/player checks the club's plan limit
  and returns `402 Payment Required` with an upgrade prompt when exceeded.
- The **payment gateway is abstracted** behind one interface. Today the `manual`
  gateway activates subscriptions immediately so the full flow works without
  external keys. Wiring PayFast/Paystack/Stripe later is a drop-in change —
  **this is the main decision to make with the finance team** (which provider,
  pricing in ZAR, VAT handling, trial length).

---

## 7. Realtime & Notifications

- **Socket.IO** authenticates with the same JWT as REST.
- Rooms: `match:<id>` (live match), `tenant:<id>` (club-wide), `user:<id>`
  (personal).
- **In-app notification centre** (this phase): bell icon with unread badge,
  live push on new notification, mark-read/all-read. Notifications are raised
  for messaging, call-ups, billing changes, and data requests.

---

## 8. Data Model (core tables)

```
clubs (tenant) 1───∞ users
   │                  │
   │ 1                │ 1
   ▼ ∞                ▼ ∞
teams 1───∞ players ──── guardian_players ───∞ guardians
   │            │
   │ 1          │ 1
   ▼ ∞          ▼ ∞
matches ──∞ match_events / lineups / match_callups
			player_documents (with verification)

Platform tables (added this phase):
  audit_log · notifications · subscription_plans · club_subscriptions
  billing_invoices · consent_records · data_requests
```

Conventions: UUID primary keys, `created_at`/`updated_at` (trigger-maintained),
`tenant_id` index on every domain table, idempotent boot-time migrations.

---

## 9. Deployment & Operations

- **Frontend** → Vercel (global CDN, automatic builds from `master`).
- **Backend + DB** → Render (managed PostgreSQL with SSL; web service).
- **Migrations** run automatically on every boot and are idempotent — safe,
  zero-downtime schema evolution.
- **Config** via environment variables (`.env.development` / `.env`).
- **Health check**: `GET /health`.
- **Tests**: `npm test` (Vitest) — RBAC, tenant isolation, payment gateway.

---

## 10. Scalability & Future Roadmap

**Scales today:** stateless JWT API can run multiple instances behind a load
balancer; PostgreSQL connection pooling; CDN-served frontend.

**Planned (discuss priority):**
- AI/ML: automated match-event detection from uploaded video; player
  performance prediction; injury-risk insights.
- Live payment gateway integration (provider chosen with finance).
- Mobile PWA / offline mode for poor-signal touchlines.
- Reporting exports (PDF match reports, CSV roster/contracts).
- Injury/medical tracking and training attendance.

---

## 11. What to Decide Before Finance Joins

1. **Payment provider** — PayFast vs Paystack vs Stripe (SA market + fees).
2. **Pricing & currency** — confirm ZAR tiers, VAT, annual vs monthly, trials.
3. **Plan limits** — validate the team/player caps per tier against real clubs.
4. **Refund/dunning policy** — what happens on failed payment (`PAST_DUE`).
5. **Compliance sign-off** — POPIA registration / data processing agreement.

---

*Document owner: Engineering. Status: current as of this architecture phase —
billing, notifications, audit, compliance, and security hardening implemented
and tested.*
