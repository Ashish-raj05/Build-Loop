# Loop-test

Calm, minimal client follow-up tracker.

## Architecture
- **artifacts/loop** — React + Vite + Tailwind v4, wouter routing, TanStack Query.
- **artifacts/api-server** — Express + TypeScript (port 8080).
- **lib/db** — Drizzle ORM + Postgres. Tables: `users`, `clients`, `follow_ups`. Cadence enum: `one_time | weekly | monthly | quarterly`.
- **lib/api-spec** — OpenAPI 3.1; codegen produces `lib/api-zod` and `lib/api-client-react`.

## Auth
- JWT (HS256) signed with `SESSION_SECRET`, stored in httpOnly cookie `loop_token` (7-day expiry).
- bcryptjs password hashing.
- `requireAuth` middleware sets `req.userId`; routes read it via `getUserId(req)`.
- Frontend uses `credentials: "include"` (set in `lib/api-client-react/src/custom-fetch.ts`).

## Endpoints
- `POST /api/auth/signup` `{fullName,email,password}` → User + sets cookie
- `POST /api/auth/login` `{email,password}` → User + sets cookie
- `POST /api/auth/logout` → clears cookie
- `GET /api/auth/me` → User
- `GET/POST/PUT/DELETE /api/clients[/:id]`
- `GET /api/follow-ups/today`
- `PATCH /api/follow-ups/:id/complete` → marks done; auto-schedules next occurrence based on cadence

## Follow-up generation
`lib/followUps.ts` generates a rolling window of pending occurrences per client based on cadence. On completion, the next occurrence is scheduled and the window topped up.

## Design tokens
Off-white background `#F9FAF7`, soft green primary `#4A7C59`, max-width 680px, Inter font.
