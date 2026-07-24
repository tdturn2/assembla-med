# API conventions

Applies to `apps/api` (Nest). Keep clients (`apps/web`, Event App) aligned via `@assembla-med/shared` types.

## Base

- Prefix: `/api`
- JSON request/response
- Auth: httpOnly cookie `am_session` (`credentials: 'include'` from the browser)
- CORS: allowlisted origins via `CORS_ORIGIN` (comma-separated)

## Errors

All thrown HTTP errors should serialize as:

```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Not a member of this organization",
  "path": "/api/organizations/abc",
  "timestamp": "2026-07-23T19:00:00.000Z"
}
```

Validation failures (`400`) may use `message` as a string or string array (class-validator).

Do not leak stack traces or SQL in production responses.

## Auth & tenancy

- Unauthenticated → `401`
- Authenticated but not a member of `:orgId` → `403` (never `404` for cross-tenant probing of known IDs is acceptable; we use `403` for non-members)
- Missing org → `404` only when the route param is absent/malformed; non-members still get `403`
- Org-owned routes must use `AuthGuard` + `OrgMemberGuard` (and `@Roles(...)` when needed)
- Every new org-owned Prisma query must be scoped by `organizationId` from the membership, not from untrusted body fields alone

## Pagination (when list endpoints grow)

Use cursor or offset consistently. Preferred query shape:

```http
GET /api/organizations/:orgId/kols?limit=50&cursor=<id>
```

Response envelope:

```json
{
  "items": [],
  "nextCursor": null
}
```

Until a list needs it, return a named collection (`organizations`, `members`) without pagination.

## Idempotency

For mutating endpoints that may be retried (check-in, CVENT push, invite send):

- Client sends `Idempotency-Key: <opaque string>`
- Server stores key + org + route hash + response for a TTL window
- Replays return the original result without duplicating side effects

Phase 0 does not yet persist idempotency keys; new Phase 1+ write endpoints should be designed so keys can be added without schema thrash (stable IDs, unique constraints).

## Audit

Call `AuditService.log` for:

- Auth: register, login, logout
- Org admin: create org, add/update/remove members
- Later: ToV capture, exports, integration pushes, role/permission changes

## Versioning

No `/v1` prefix yet. Breaking changes require a shared-package bump and coordinated web deploy until we introduce explicit versioning.
