# Assembla Med

Life science congress KOL engagement platform — Nuxt Console + NestJS API monorepo.

See [initial-plan.md](./initial-plan.md) for the quality roadmap.

## Structure

```text
apps/
  web/       # Nuxt 4 Console (Nuxt UI)
  api/       # NestJS API
packages/
  shared/    # Shared TypeScript contracts
docs/        # Conventions, glossary, staging
scripts/     # Local DB backup / restore drill
```

## Prerequisites

- Node.js 22+
- pnpm 11 (`corepack enable && corepack prepare pnpm@11.13.1 --activate`)
- Local Postgres (Homebrew/Herd) — same pattern as spa/ops

## Setup

```bash
createdb assembla_med   # once

pnpm install
pnpm --filter @assembla-med/shared build
pnpm --filter @assembla-med/api prisma:migrate
```

Copy `apps/api/.env.example` → `apps/api/.env` if needed:

`postgresql://terryturner@localhost:5432/assembla_med`

## Docs

- [Domain glossary](./docs/domain-glossary.md)
- [API conventions](./docs/api-conventions.md)
- [Staging & secrets](./docs/staging-and-secrets.md)
- [Check-in corrections](./docs/check-in-corrections.md)
- [Mailgun outreach](./docs/mailgun-outreach.md)

## API (Phase 0–1)

Session cookie: `am_session` (httpOnly).

### Auth & orgs

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | `{ email, password }` |
| POST | `/api/auth/login` | `{ email, password }` |
| POST | `/api/auth/logout` | auth required |
| GET | `/api/auth/me` | auth required |
| POST | `/api/organizations` | create org (caller becomes `org_admin`) |
| GET | `/api/organizations` | list my orgs |
| GET | `/api/organizations/:orgId` | member only |
| GET/POST… | `/api/organizations/:orgId/members` | see prior docs |

### Congress spine (org member; writes: `org_admin`/`rep`)

| Method | Path | Notes |
|---|---|---|
| CRUD | `/api/organizations/:orgId/congresses` | + `/:id/summary` |
| CRUD | `/api/organizations/:orgId/kols` | `POST …/import` with `{ csv }` |
| CRUD | `/api/organizations/:orgId/appointments` | conflict detection; `GET …/by-code/:code` |
| POST | `/api/organizations/:orgId/check-ins` | by `appointmentId` or `checkInCode`; optional signature |
| POST | `/api/organizations/:orgId/check-ins/:id/void` | then recreate with `replacesCheckInId` |
| GET | `/api/organizations/:orgId/congresses/:id/export/check-ins` | CSV |
| CRUD/send | `/api/organizations/:orgId/outreach/...` | templates, campaigns, send |
| Public | `/api/public/invitations/:token` | RSVP + open pixel |

## Development

```bash
pnpm dev        # web :3018 + api :4000
pnpm dev:web
pnpm dev:api
```

- Console: http://localhost:3018
- API health: http://localhost:4000/api/health

## Database backups (local)

```bash
pnpm db:backup
pnpm db:restore-drill   # backup → restore scratch DB → verify → drop
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run web + api in parallel |
| `pnpm build` | Build all packages/apps |
| `pnpm lint` / `typecheck` / `test` | Quality gates |
| `pnpm db:backup` | `pg_dump` into `backups/` |
| `pnpm db:restore-drill` | Prove restore works |

## Phase status

**Phase 0–2** in place (foundations, congress spine + console, Mailgun outreach). Next: staging/Neon, bounce webhooks, or Phase 3 CVENT / Event App.
