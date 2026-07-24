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

## Staging deploy checklist (repeatable)

1. `pnpm install`
2. `pnpm --filter @assembla-med/shared build`
3. `pnpm --filter @assembla-med/api exec prisma migrate deploy`
4. `pnpm build`
5. Start API with staging env (`COOKIE_SECURE=true`, staging `CORS_ORIGIN`, Neon `DATABASE_URL`)
6. Smoke: register → create org → `/api/auth/me` → health

## Neon point-in-time recovery

For staging/prod on Neon, enable/retain PITR per Neon plan and document who can restore. Local `pg_dump` scripts do not replace Neon backups—they cover laptop/dev recovery and drill practice.
