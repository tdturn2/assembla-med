# Assembla Med API — build from repo root (Railway Dockerfile builder)
# Context: repository root. Settings → Dockerfile path: Dockerfile.api

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.13.1 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @assembla-med/shared build \
  && pnpm --filter @assembla-med/api exec prisma generate \
  && pnpm --filter @assembla-med/api build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 8080
CMD ["sh", "-c", "pnpm --filter @assembla-med/api exec prisma migrate deploy && pnpm --filter @assembla-med/api start:prod"]
