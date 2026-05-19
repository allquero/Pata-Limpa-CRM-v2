# Threat Model

## Project Overview

Pata Limpa CRM is a multi-tenant SaaS for Brazilian pet shops. The production application consists of a React/Vite frontend in `artifacts/grooming-crm` and an Express 5 API in `artifacts/api-server`, backed by PostgreSQL through Drizzle ORM in `lib/db`. Authentication uses Replit OIDC, with browser sessions stored in the `sessions` table and mobile clients using opaque bearer session IDs.

Per project assumptions, production traffic is terminated with TLS by the platform, `NODE_ENV` is `production`, and the mockup sandbox is not deployed. This threat model therefore focuses on production-reachable code in `artifacts/api-server`, `artifacts/grooming-crm`, and shared libraries they depend on.

## Assets

- **Tenant business data** — clients, pets, appointments, services, packages, financial entries, reports, and message templates. Cross-tenant disclosure or modification would directly impact customer privacy and business operations.
- **User accounts and sessions** — Replit OIDC identities, persisted session IDs, and refresh/access tokens inside the server-side session store. Compromise would enable account takeover.
- **Administrative control plane** — admin-only tenant provisioning and sales/access-period management in `/api/admin/*`. Compromise would expose all tenants and allow broad business-impacting changes.
- **Contact data and communications content** — phone numbers, emails, addresses, and WhatsApp template contents. This is personal/business data that must remain tenant-scoped.
- **Application secrets and infrastructure access** — database connection strings and OIDC-related environment values. Exposure would expand compromise beyond a single tenant.

## Trust Boundaries

- **Browser/mobile client to API** — all frontend and mobile requests cross into the Express API. The client is untrusted; every request must be authenticated, authorized, and tenant-scoped on the server.
- **API to PostgreSQL** — the API has broad database access. Any authorization bypass or unsafe query in the API tier can expose or tamper with all tenant data.
- **Unauthenticated to authenticated routes** — `/api/healthz`, `/api/login`, `/api/callback`, and mobile token exchange are reachable without an authenticated app session; business routes are intended to require auth plus an active tenant.
- **Authenticated tenant user to administrator** — `/api/admin/*` bypasses tenant scoping by design and relies entirely on `requireAdmin`; a flaw here would expose global data.
- **Production to dev-only artifacts** — `artifacts/mockup-sandbox` is intentionally excluded from production analysis unless future evidence shows it is deployed.

## Scan Anchors

- **Production entry points:** `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/grooming-crm/src/main.tsx`, `artifacts/grooming-crm/src/Router.tsx`
- **Highest-risk backend areas:** `artifacts/api-server/src/routes/*.ts`, especially `auth.ts`, `admin.ts`, `appointments.ts`, `pets.ts`, `clients.ts`, `packages.ts`, `reports.ts`, and `middlewares/requireTenant.ts`
- **Auth/session handling:** `artifacts/api-server/src/lib/auth.ts`, `artifacts/api-server/src/middlewares/authMiddleware.ts`, `lib/replit-auth-web/src/use-auth.ts`, `lib/api-client-react/src/custom-fetch.ts`
- **Public surfaces:** `/api/healthz`, `/api/login`, `/api/callback`, `/api/mobile-auth/token-exchange`, `/api/mobile-auth/logout`
- **Admin surface:** `/api/admin/*`
- **Dev-only area to usually ignore:** `artifacts/mockup-sandbox/**`

## Threat Categories

### Spoofing

The application trusts Replit OIDC claims and server-stored session IDs to identify users. All protected API routes must require a valid session, session identifiers must remain unpredictable, and admin access must be enforced server-side based on trusted identity data rather than frontend state.

### Tampering

Tenant users can create and update appointments, clients, pets, services, packages, financial entries, and message templates. The API must ignore client-supplied tenant identifiers, validate ownership of referenced records server-side, and ensure every write is constrained to the authenticated tenant.

### Information Disclosure

This is the dominant risk for this project because it is a multi-tenant CRM. Every read path, join, report, and nested lookup must scope data to `req.tenantId` (or equivalent trusted ownership checks), and admin-only data must never be exposed to ordinary tenant users. Logs and API errors must also avoid leaking tokens, cookies, or internal details.

### Denial of Service

Public auth endpoints and expensive authenticated endpoints (notably reports and lead generation) can be abused to consume resources. The service should avoid unbounded work from attacker-controlled inputs, and security decisions should not assume the frontend limits request frequency or input size.

### Elevation of Privilege

The main privilege-escalation risk is broken tenant isolation or admin-bypass logic. Server-side checks must prevent a tenant user from reading or mutating another tenant’s records, and `requireAdmin` must remain the sole gate for global admin routes. Any helper that validates related entity ownership must stay complete as schemas evolve.
