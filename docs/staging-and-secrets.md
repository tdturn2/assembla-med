# Staging & secrets

Phase 0 staging target: **Neon Postgres** for the database + your preferred app host for API/web (Fly, Render, Railway, Vercel+separate API, etc.). Local remains Homebrew/Herd Postgres.

## Secrets (never commit)

| Variable | Where | Notes |
|---|---|---|
| `DATABASE_URL` | local `.env`, staging/prod host secrets | Local: `postgresql://terryturner@localhost:5432/assembla_med` |
| `CORS_ORIGIN` | host secrets | e.g. `https://staging.assemblamed.com` |
| `COOKIE_SECURE` | host secrets | `true` on HTTPS staging/prod |
| `SESSION_DAYS` | optional | default `14` |
| `PORT` | optional | default `4000` |

Use `apps/api/.env.example` as the checklist. Real Neon URLs live only in the host secret store / password manager.

## Create Neon staging (once)

1. Create a Neon project (e.g. `assembla-med-staging`) in the Neon console or via Neon MCP/`neonctl`.
2. Copy the connection string (prefer pooled + `sslmode=require` for serverless hosts).
3. Set `DATABASE_URL` in the staging host.
4. Deploy migrations:

```bash
cd apps/api
DATABASE_URL="postgresql://...@...neon.tech/neondb?sslmode=require" pnpm exec prisma migrate deploy
```

5. Confirm health: `GET https://<api-host>/api/health` → `database: "up"`.

Repeat the same pattern for production with a separate Neon branch/project.

## Local backups

No Docker. Use the scripts against Herd/Homebrew Postgres:

```bash
# Manual backup
pnpm db:backup

# Prove backup → restore works (uses scratch DB, then drops it)
pnpm db:restore-drill
```

Dumps land in `backups/` as custom-format `.dump` files (gitignored). Scripts prefer `/opt/homebrew/bin` clients so Herd’s older `psql` does not break restores. Keep at least one successful restore drill on record before treating staging as ready.

## Railway (demo / staging)

One GitHub repo → **two services**. Prefer **Dockerfile** builder (predictable; one `pnpm install`).

### API service

| Setting | Value |
|---|---|
| Builder | **Dockerfile** |
| Dockerfile path | `Dockerfile.api` |
| Custom build / start | leave empty (Dockerfile `CMD` handles migrate + start) |
| Public networking port | `8080` |
| Healthcheck | `/api/health` |

Variables: `DATABASE_URL` (Neon assembla-med project), `COOKIE_SECURE=true`, `CORS_ORIGIN=<web url>`, `MAILGUN_DRY_RUN=true`, optional Mailgun keys.

Do **not** set a Custom Build Command that runs `pnpm install` again — that doubles install time.

### Web service

| Setting | Value |
|---|---|
| Builder | **Dockerfile** |
| Dockerfile path | `Dockerfile.web` |
| Custom start | **empty** (Dockerfile starts Nitro via `node .output/server/index.mjs`) |
| Build arg / variable | `NUXT_PUBLIC_API_BASE=https://<api-host>/api` |
| Public networking port | `8080` |

API and web are **independent** services. Do not set a deploy dependency from API → web. Fix web start; API can deploy in parallel.

**Do not** use `nuxt preview --host 0.0.0.0` — Nuxt treats `0.0.0.0` as a directory and looks for `.output` under `/app/apps/web/0.0.0.0/`.

### Before you wait on Railway

```bash
pnpm run build:api   # ~seconds locally; if this fails, Railway will fail
```

### Neon

Use a dedicated **assembla-med** Neon project/DB — never the spa/ops database.

## Neon point-in-time recovery

For staging/prod on Neon, enable/retain PITR per Neon plan and document who can restore. Local `pg_dump` scripts do not replace Neon backups—they cover laptop/dev recovery and drill practice.
