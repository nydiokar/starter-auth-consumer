Auth Consumer App (NestJS)

Purpose
- Minimal Nest app to validate the `@lean-kit/auth` package end-to-end: register/login/me/logout, verify/reset, sessions, RBAC.

Quick Start
- Prereqs: Node 18+, Docker (for Redis), SQLite (file-based).
- From this repo root:
  1) Build auth package: `cd ../starter-kit-auth/package && npm install` (auto-builds via prepare hook)
  2) Return to consumer: `cd ../../starter-auth-consumer`
  3) Copy env: `cp .env.example .env` and adjust if needed
  4) Install deps: `npm install`
  5) Setup database: `npm run prisma:generate && npm run prisma:migrate && npm run prisma:seed`
  6) Start Redis: `docker compose up -d` (requires Docker Desktop running)
  7) Run app: `npm run dev`

Env
- Copy `.env.example` to `.env` and adjust as needed.

Endpoints
- Provided by the package:
  - POST /auth/register, POST /auth/login, POST /auth/logout, GET /auth/me
  - POST /auth/request-verify, POST /auth/verify
  - POST /auth/request-reset, POST /auth/reset-password
  - GET /sessions, POST /sessions/:id/revoke
- App example route:
  - GET /admin/ping (requires role: admin)

Testing manually
- Use `examples/requests.http` in this repo (already set to http://localhost:4000).
- Include `x-csrf-token` on mutating requests when session cookie present (see docs).

Frontend test UI
- Static UI is served from `http://localhost:4000/` via Nest (Express static).
- Files live in `public/` (`index.html`, `app.js`).
- Supports register, login, logout, me, request/verify email, request/reset password, sessions list/revoke, admin ping.
- CSRF header: UI reads cookie `app.csrf` and sends `x-csrf-token` for POSTs when present.
- Tip: Add `NODE_ENV=development` in `.env` to disable `Secure` cookies for local HTTP.

RBAC note
- To exercise `/admin/ping`, assign the `admin` role to your user in SQLite `dev.db` (see Prisma models). For example, link your user id to the `admin` role in the `UserRole` table.

Dev tokens (no SMTP required)
- In `NODE_ENV=development`, the app overrides the mailer to capture tokens in-memory.
- Endpoints:
  - `GET /dev/tokens?email=you@example.com` → returns captured verify/reset tokens
  - `POST /dev/tokens/clear` with optional `{ email }` to clear
  - `POST /dev/promote-admin` with `{ email }` to grant admin role
- UI buttons labeled “Dev: Get Token” will fetch and auto-fill the latest token for the given email.

Dev tools (high‑leverage checks)
- WhoAmI/session controls: view current session id + TTL, expire session, set short TTL.
- Rate limits: run repeated wrong-password logins; clear rate-limit buckets.
- Audit logs: list last 50 and clear quickly to see new events.
- Config view: inspect effective cookie/CSRF config (dev safe subset).
- Tokens panel: list/clear captured verify/reset tokens.
