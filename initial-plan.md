# Assembla Med — Quality Roadmap

Assembla Med is a SaaS platform for life science teams to plan and run Thought Leader (KOL) engagement around clinical congresses: outreach, scheduling, check-in, Transfer of Value (ToV) capture, and compliant data handoff into existing workflows (CVENT / CRM).

This document replaces the partner day-by-day launch checklist. It is a **quality-first roadmap**: product boundaries, architecture, and phased delivery. Dates are intentionally omitted; each phase ends when its exit criteria are met.

---

## 1. Product framing

### Service tiers (packaging)

**Congress Core** — event execution essentials

| Capability | Intent |
|---|---|
| Engagement & appointment suite | Schedule and track meetings / advisory participation; resolve conflicts; team visibility |
| Outreach management | Compliant invitations, tracking, response capture |
| Congress check-in | Real-time attendance, rep notes, ToV, digital signatures |
| Data export / CRM handoff | Accurate exports; CVENT (and later CRM) push without duplicate entry |
| Reporting | Operational summaries that support decisions—not a full BI suite on day one |

**Congress Core+** — planning & intelligence (after Core is trusted)

| Capability | Intent |
|---|---|
| KOL profile research | Influence, region, therapeutic area, past engagement |
| Strategic targeting | Prioritize who to engage and keep priorities aligned |
| Room & layout management | Rooms, seating, AV, layouts |
| Post-meeting insights | Structured follow-ups and takeaways |
| Ancillary / satellite meetings | Linked strategy meetings tied to KOLs and congress activity |

### Surfaces (two clients, one API)

| Surface | Audience | Job |
|---|---|---|
| **Console** | Planners, org admins, managers | Configure congresses, KOLs, campaigns, schedules, attendance, exports, integrations |
| **Event App** | Booth / field staff on-site | Agenda, logistics, lodging, safety, personal + company calendar, check-in, notes |
| **API** | Both clients (+ future mobile) | Auth, tenancy, domain logic, jobs, integrations |

Event App is a first-class product surface, not an afterthought—but it ships **after** the congress operations spine is solid.

### Non-goals (until later phases)

- Fake “6-week public launch” commitments
- Claiming full GDPR / HIPAA readiness from a registration checkbox
- Offline-first check-in as a launch blocker
- Core+ research / rooms / targeting before Core trust
- Bidirectional CRM sync marketed as done when only CSV exists
- A separate Python microservice for sync or CVENT

---

## 2. Target architecture

### Stack (confirmed direction)

| Layer | Choice | Notes |
|---|---|---|
| Console / Event App | **Nuxt 4** + Nuxt UI + Tailwind | `apps/web` today; Event App later as second app or layout split |
| API | **NestJS** | `apps/api` — modules, guards, queues, integrations |
| Shared contracts | **`packages/shared`** | DTOs / types shared by web + api |
| Database | **PostgreSQL** | Local Homebrew/Herd for dev (`postgresql://terryturner@localhost:5432/assembla_med`); Neon for staging/prod |
| ORM / migrations | **Prisma** | Wired in `apps/api`; migrate locally, `prisma migrate deploy` on Neon |
| Object storage | S3-compatible | Signatures, documents—not BLOBs in Postgres long-term |
| Email | SES (or equivalent) | Domain auth, bounces, complaints required for real outreach |
| Jobs | Nest + BullMQ (Redis) or equivalent | Email, CVENT push, retries, idempotency |
| Hosting (early) | Flexible (e.g. Neon + app hosts) | Prefer staging/prod separation and automated backups over a single Lightsail box forever |

### Repo layout (scaffolded)

```text
apps/web          # Nuxt Console (:3018)
apps/api          # NestJS API (:4000, global prefix /api)
packages/shared   # Shared TypeScript contracts
```

### Design principles

1. **Tenant isolation first** — every org-owned row is scoped; tests prove cross-org leakage is impossible.
2. **One system of record** — Nest + Postgres; Nuxt does not own business rules (thin BFF only if needed).
3. **Compliance artifacts are durable** — signed ToV / signatures are not casually editable; corrections are new records.
4. **Idempotent writes** — clients and integrations retry safely (`Idempotency-Key`, stable IDs, version/`updated_at`).
5. **Boring UI, sharp domain** — prefer trusted scheduling logic over elaborate drag-and-drop early.
6. **Sales language ≤ product reality** — “CRM / CVENT integration” only after the integration phase exits.
7. **API ready for offline later** — design sync-friendly contracts in Phase 0–1 even if offline ships much later.

### High-level topology

```text
assemblamed.com
        │
        ├── Console (Nuxt)
        ├── Event App (Nuxt)      ← later phase
        │
        ▼
   NestJS API
        │
        ├── PostgreSQL
        ├── Object storage (signatures / docs)
        ├── Queue workers (email, CVENT, retries)
        └── External: SES, CVENT, future CRM
```

### Suggested Nest modules (start lean)

`Auth` · `Orgs` · `Congresses` · `Kols` · `Outreach` · `Appointments` · `CheckIns` · `Integrations` · `Audit` · `Files`

---

## 3. Domain model (MVP spine)

Happy path:

**Organization → Congress → KOL → Campaign → Invitation → Appointment → Check-in (ToV + signature) → Export / Integration push**

### Core entities (direction)

| Entity | Notes |
|---|---|
| `organizations` | Tier (`core` / `core_plus`), settings |
| `users` + `memberships` | Many-to-many; roles (`org_admin`, `rep`, `viewer`, etc.) |
| `congresses` | Org-scoped; planning / active / completed |
| `kols` | **Org-scoped** for v1 (no global shared KOL DB) |
| `templates` / `campaigns` / `invitations` | Outreach with clear status machine |
| `appointments` (+ `appointment_attendees`) | Conflict detection; QR / check-in code; engagement type + contracted flag |
| `check_ins` | Attendance, notes, ToV fields, signature storage key, push status |
| `audit_events` | Append-only; who/what/when |
| Integration credentials | Encrypted; never plain API keys in the DB |

### Explicit MVP simplifications

- Fold fuzzy “engagements” into appointments via `engagementType` + `isContracted` (no separate engagement entity).
- Multi-attendee roster on appointments (`appointment_attendees`: KOL / staff / external).
- Defer `influence_score`, strategic targeting, room layouts to Core+.
- Signatures → object storage + metadata in Postgres.
- Reserve `sync_status` (or equivalent) for offline later; online path is authoritative first.

---

## 4. Phased roadmap

Each phase has a **goal**, **in scope**, **out of scope**, and **exit criteria**. Do not start the next phase until exit criteria pass.

---

### Phase 0 — Foundations

**Goal:** A secure multi-tenant platform skeleton you can build features on without rework.

**In scope**

- Repo structure: Nuxt app(s) + Nest API (+ shared types if useful)
- Postgres, migrations, CI (lint, typecheck, test, migrate)
- Auth (sessions or access/refresh—prefer httpOnly cookies for web-first)
- Organizations, memberships, roles
- Tenant scoping middleware / guards on every org-owned query
- Audit log primitive (write path used by later features)
- Staging environment, secrets management, automated DB backups + restore drill
- Short domain glossary + API conventions (errors, pagination, idempotency)

**Out of scope**

- Product UI beyond login / org shell
- CVENT, outreach, check-in
- Production marketing site polish

**Exit criteria**

- [x] User can register/sign in, belong to an org, and be denied another org’s data (automated test)
- [x] Migrations apply cleanly on empty and existing DB
- [x] Staging deploy is repeatable; backup restore verified once (local restore drill + Neon staging runbook)
- [x] Audit helper exists and is used for at least auth/org admin actions

**Status:** Complete enough to start Phase 1. Create the Neon staging project when you want a shared cloud DB; runbook is in `docs/staging-and-secrets.md`.

---

### Phase 1 — Congress operations spine

**Goal:** One org can run **one congress online** end-to-end with data they trust.

**In scope**

- Congress CRUD
- Per-tenant KOL list + CSV import
- Appointments: create / edit / cancel, conflict detection, team visibility (simple calendar or list+detail UI is fine)
- Online check-in (QR or short code)
- ToV capture + signature pad → object storage
- Attendance / ToV CSV export
- Basic operational views (counts, status lists)—not full dashboards

**Out of scope**

- Offline / PWA sync
- Email campaigns (stubs OK)
- CVENT live push
- Event App
- Core+ features

**Exit criteria**

- [x] Seed org can create a congress, import KOLs, book appointments without false conflicts
- [x] Staff can check in an attendee online; ToV + signature persisted durably
- [x] Export matches what was captured (spot-check + automated assertions)
- [x] Signed records cannot be silently overwritten (correction path documented)
- [x] Cross-tenant access attempts fail in tests

**Status:** API spine complete (`phase1.e2e-spec.ts`). Console UI for these flows is next product surface work; start Phase 2 when outreach is the priority.

---

### Phase 2 — Outreach that holds up

**Goal:** Invitation workflows good enough for real HCP/KOL communication without burning reputation or deliverability.

**In scope**

- Templates with merge fields
- Campaign builder: select KOLs → send
- Provider setup (e.g. SES): domain auth, bounce/complaint handling
- Invitation status: sent / opened / responded / declined (as applicable)
- Reply / response capture linked forward to appointment creation where possible
- Suppression / basic compliance controls (who can send, audit of sends)

**Out of scope**

- Fancy journey builders
- Full marketing analytics suite
- “Personalized at scale” AI copy

**Exit criteria**

- [x] Production-capable sending path (Mailgun; test redirect via `MAILGUN_TEST_TO`)
- [x] End-to-end: campaign → invite → response → optional appointment
- [x] Send actions appear in audit log
- [x] Failure modes visible in UI (per-invitation `failed` + error message)

**Status:** Mailgun outreach API + Console + public RSVP complete. Bounce webhooks can come later.

---

### Phase 3 — Integrations

**Goal:** Reliable handoff into CVENT (then other CRM as needed) without duplicate or ghost records.

**Status:** Pre-contract mock slice live — simulated destination + push status/replay + provisional mapping docs + CVENT-oriented CSV. Real `CventAdapter` waits for customer-controlled sandbox (no shared logins).

**In scope**

- CVENT auth + field mapping document
- Push ToV / attendance (and agreed fields) with retries
- Idempotent push + clear success/failure state on each check-in / batch
- Admin UI to inspect failures and replay
- Sandbox validation before any production credentials

**Out of scope**

- Full bidirectional CRM sync
- “Any CRM” adapters
- Marketing claim of complete CRM suite
- Shared buyer CVENT credentials (policy)

**Exit criteria**

- [x] Provisional mapping doc + buyer questionnaire (no-login) — `docs/cvent-field-mapping.md`
- [x] Mock push verified for happy path + retry path + idempotency
- [x] Duplicate push does not create duplicate mock records
- [x] Failed pushes are visible and replayable (Console check-in)
- [ ] Sandbox push verified with customer-owned credentials
- [ ] Mapping confirmed against real tenant artifacts / sandbox

See also: `docs/cvent-csv-self-import.md`, `docs/integration-secrets.md`.

---

### Phase 4 — Event App

**Goal:** On-site companion that reduces Slack/spreadsheet chaos for booth and field staff.

**Status:** First slice live in `apps/web` at `/event` (same Nuxt app, mobile layout). Console authors day-of content via congress **Event guide**.

**In scope (prefer read-heavy first)**

- Home: registered congresses
- About congress: agenda, floor plans, booth locations
- Contacts / logistics / lodging / safety & security
- Company + personal calendar views
- Role-gated check-in and notes for staff
- Data disclosures section (symposiums, presentations, posters, etc.)

**Defer within this phase if needed**

- Messaging board / chat
- Heavy offline
- Booth training workflows beyond simple acknowledgement
- Separate `apps/event` package (extract later if deploy/PWA needs diverge)

**Exit criteria**

- [x] Staff can run a congress day from Event App for logistics + schedule without the Console
- [x] Check-in from Event App uses the same API contracts as Console
- [x] Content is congress-scoped and tenant-safe
- [ ] Polish content authoring + real congress dry-run with a partner org
---

### Phase 5 — Hardening, offline, Core+

**Goal:** Production resilience, disconnected check-in where required, and paid Core+ intelligence.

**In scope (ordered by dependency)**

1. **Hardening** — pen test / security review, retention policies, export/delete (GDPR), DPA templates, monitoring/alerting, performance under congress-day load
2. **Offline / PWA check-in** — IndexedDB queue, sync protocol, conflict rules, using Phase 0–1 idempotent APIs
3. **Core+** — profile research, targeting, rooms/layouts, post-meeting insights, satellite meetings
4. **Compliance program** — only claim what is evidenced (BAA/HIPAA only if PHI scope actually requires it)

**Exit criteria (examples)**

- [ ] Offline check-in survives airplane mode and reconciles without duplicate attendance
- [ ] Core+ features gated by subscription tier
- [ ] Compliance claims match implemented controls and legal review

---

## 5. Quality bar (applies to every phase)

| Area | Bar |
|---|---|
| Tenancy | Automated tests for isolation on every new org-owned resource |
| Data | Migrations reviewed; no destructive prod migrate without backup |
| Audit | Sensitive actions (send invite, check-in, ToV, export, integration push) logged |
| Integrations | Retries + idempotency + visible failure |
| UX | One primary happy path polished before edge-case sprawl |
| Security | HTTPS, hashed passwords, CSRF/XSS defaults, secrets not in git, least-privilege roles |
| Docs | Short “how to run a congress” internal runbook updated per phase |

---

## 6. Compliance posture (honest)

- **MVP language:** security-minded, audit-friendly, exportable engagement/ToV records—not “GDPR/HIPAA complete.”
- Clarify early whether the system stores **PHI** vs primarily **HCP/KOL engagement + ToV**. That decision drives BAA urgency and marketing.
- Registration consent ≠ GDPR program. Export/delete, retention, DPA, and lawful basis for outreach belong in Phase 5 (start drafting earlier).
- ToV + signatures are evidence: retention and immutability matter more than form chrome.

---

## 7. Event App feature map (reference)

Use this when Phase 4 starts; not a Phase 1 build list.

| Section | Features |
|---|---|
| Home | Registered congresses; upcoming events |
| Data disclosures | Symposiums, independent presentations, posters, other |
| Booth staff | Training acknowledgement, staff schedule, messaging (later) |
| Contacts | Congress logistics, teammates |
| About congress | Agenda, floor plans, booth locations |
| Lodging | Hotel, confirmation, nearby food |
| Calendar | Company schedule + personal (KOL meetings, assignments) |
| Safety & security | Security contact, emergency, rally points, hospital, pharmacy |

---

## 8. Tier comparison (packaging reference)

| Capability | Core | Core+ |
|---|---|---|
| Engagement / appointment scheduling | ✓ | ✓ |
| Outreach & invitations | ✓ | ✓ |
| Session / agenda support | ✓ | ✓ |
| Real-time check-in | ✓ | ✓ |
| ToV capture & signatures | ✓ | ✓ |
| Export + CVENT handoff | ✓ | ✓ |
| Operational reporting | ✓ | ✓ |
| KOL profile research | — | ✓ |
| Strategic targeting | — | ✓ |
| Room & layout management | — | ✓ |
| Post-meeting insights | — | ✓ |
| Satellite meeting setup | — | ✓ |

---

## 9. Working agreements

- **Partner plan** remains useful as a feature catalog; this roadmap owns sequencing and architecture.
- **No phase skipping** for demos that imply unfinished phases are production-ready.
- **Beta success** = one real org, one real congress, Phase 1–2 (and 3 if they need CVENT) exit criteria met—not feature count.
- Prefer **TypeScript end-to-end** (Nuxt + Nest workers) over a side Python service unless Core+ ML/research clearly demands it.

---

## 10. Immediate next steps

1. ~~Confirm stack: **Nuxt + NestJS + Postgres**~~ — monorepo scaffolded (`apps/web`, `apps/api`, `packages/shared`).
2. ~~Choose ORM + local DB~~ — Prisma 6 + Homebrew/Herd Postgres (`assembla_med`); Neon later for staging/prod.
3. ~~Auth + orgs/memberships + tenant guards + audit writes~~ — session cookies, org APIs, e2e isolation test.
4. ~~Phase 0 closeout~~ — backup/restore drill, staging/secrets runbook, API + domain docs, CI with Postgres migrate + e2e.
5. ~~Phase 1 congress spine (API)~~ — congresses, KOLs (+ CSV), appointments + conflicts, check-in/ToV/signatures, export, corrections.
6. ~~Phase 1 Console UI~~ — auth, orgs, congresses, KOLs, appointments, check-in at `apps/web` (`:3018`).
7. ~~Phase 2 outreach (Mailgun)~~ — templates, campaigns, send (test→`tdturn2@gmail.com`), RSVP, audit.
9. ~~Event App first slice~~ — `/event` mobile companion + `CongressGuide` content (Console authoring).
10. ~~Pre-contract CVENT handoff~~ — mock destination push/replay, provisional mapping docs, CVENT-oriented CSV (no shared credentials).
11. Optional: Neon staging; Mailgun bounce webhooks; real `CventAdapter` when customer sandbox lands.
12. Keep Core+ visible in sales as roadmap until those phases start.

When Phase 0 is underway, replace ad-hoc tasks with a short engineering backlog keyed to that phase’s exit criteria only.
