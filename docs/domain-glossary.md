# Domain glossary

Short shared language for Assembla Med. Expand as Phase 1+ entities land.

| Term | Meaning |
|---|---|
| **Organization** | Tenant (pharma/biotech team account). All operational data is org-scoped. |
| **Membership** | Link between a user and an organization, with a role. |
| **Role** | `org_admin` (manage members/settings), `rep` (day-to-day ops), `viewer` (read-mostly). |
| **Subscription tier** | `core` vs `core_plus` packaging gate (enforced later). |
| **Congress** | A specific scientific meeting/event an org is working (Phase 1). |
| **KOL** | Key opinion leader / thought leader contact, **per organization** in v1. |
| **Campaign** | Outreach batch of invitations for a congress/plan (Phase 2). |
| **Invitation** | One outbound invite to a KOL with delivery/response state (Phase 2). |
| **Appointment** | Scheduled meeting/slot with conflict awareness (Phase 1). |
| **Check-in** | Attendance capture for an appointment, optionally with ToV + signature (Phase 1). |
| **ToV** | Transfer of Value disclosure captured at/after engagement (Phase 1). |
| **Audit event** | Append-only record of a sensitive action (auth, org admin, later ToV/export/push). |
| **Session** | Server-side login session; browser holds httpOnly cookie `am_session`. |
| **Console** | Nuxt admin/planner app (`apps/web`). |
| **Event App** | On-site staff companion at `/event` (mobile layout in `apps/web`). |
| **Integration push** | Handoff of check-in/ToV to a destination (`mock` today; `cvent` post-sandbox). Idempotent; replayable. |
| **Simulated destination** | Pre-contract mock CRM/CVENT stand-in — never claimed as live CVENT sync. |
| **Idempotency key** | Client-supplied key so retries do not create duplicate side effects (required for check-in/integrations). |
