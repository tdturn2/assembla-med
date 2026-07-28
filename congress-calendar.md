# Congress Calendar — product decisions

Operating model for per-congress calendaring. Raw stakeholder notes preserved at the bottom.

**Status:** Decisions locked (recommended defaults). Implementation follows [docs/calendaring-roadmap.md](./docs/calendaring-roadmap.md).

---

## Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Source of truth | **Assembla appointments** | Outlook/Google are send targets only (Step 3), not the system of record |
| Primary Console calendar | **Rooms-first resource calendar** | Matches “each room is a reservable space” |
| Secondary views | Congress day/week grid + My schedule | Overview + personal; booth as filter/lanes later |
| Hybrid model | **E — hybrid** (rooms → congress day → people → outbound invite) | Avoid list-only and avoid external-first |
| Intake | **`MeetingRequest` first**, walk-up can skip to confirmed | Steps 1–2 vs Step 4 walk-in |
| Booth / vendor staffing | **Separate `StaffShift`** (not TL appointments) | Different lifecycle; still on congress calendar |
| Meeting roles | **Per-appointment roles** (Scheduler, MO, MSL, TLL, …) | Org roles (`rep`/`admin`) are not enough |
| ICW dinners/receptions | **Reuse appointments** + engagement types + invite gate | One conflict engine |
| Check-in outside window | **Soft flag** (warn, don’t block) | Floor reality; offline-friendly |
| RSVP accept | **Pending placement** (no fake +24h slot); offered slots later | Stop junk appointments |
| Congress timezone | **Required** on congress (IANA); default warning if unset | Venue clock |
| Event App “Mine” | **Creator or staff attendee** (keep both) | Matches field use today |

---

## Calendar model

```text
Congress (timezone, date window)
  ├── Room resources (open days/hours + inventory)
  ├── StaffShift resources (booth / vendor)     ← separate from TL meetings
  ├── MeetingRequest (Step 1) → Appointment (Steps 2–4)
  └── Onsite: check-in, F&B, CDA/contract, outcome
```

### Views (ship order)

1. **Rooms** — time × room lanes (primary ops view)
2. **Congress** — all engagements on a day/week
3. **Mine** — Scheduler / MO / MSL / staff attendee
4. **Booth staffing** — `StaffShift` lanes or filter

External `.ics` / Outlook / Google = **outbound only**, after confirmed appointments (roadmap T7).

---

## Roles (on a meeting)

| Role | Meaning |
|---|---|
| Scheduler | Contacts TL; owns scheduling comments / slot |
| Meeting requester | Asked for the meeting (may be MO) |
| Meeting owner (MO) | Budget owner; leads the meeting |
| Thought leader (TL) | HCP / KOL (external) |
| MSL | Medical relationship owner |
| TLL | Commercial relationship owner |
| Internal attendee | Company employee |
| External (non-TL) | Non-HCP external participant |

Store these as **appointment participant roles** (and on `MeetingRequest`), not only org membership.

---

## Engagement / meeting types

Expand beyond today’s enum toward:

| Type | Notes |
|---|---|
| Ad board | |
| TL meeting | Default formal 1:1 / small |
| Informal | Unpaid discussion |
| Formal | Structured / protocol |
| Offsite | Away from booth/rooms |
| TL dinner | ICW; often invite-gated |
| HCP reception | ICW; invite-gated |
| Symposium speaker | |
| Contracted / paid advising | Maps to `isContracted` + type |
| Informal + CDA | Needs CDA capture onsite |

Commercial subtypes from Step 1:

- Contracted / paid advising  
- Informal / unpaid discussion  
- Informal / unpaid + confidentiality agreement  

---

## Workflow

### Step 1 — Meeting requested → `MeetingRequest`

Requester provides:

- TL name(s), email(s), country  
- Meeting type, topic, contracted details  
- Internal + external attendees  
- Length, AV needed  
- Budget approver / cost center  
- Comments  

No hard room/time required yet.

### Step 2 — TL team schedules → `Appointment`

- Gather TL availability (comments + later offered slots)  
- Set start/end in **congress timezone**  
- Assign room (within room open hours)  
- Assign roles (Scheduler, MO, MSL, …)  
- Status: `pending` (hold) → `confirmed`

### Step 3 — Calendar request (outbound)

- Assembla remains source of truth  
- Send invite to TL, MO, internal & external attendees (`.ics` / Graph later)  
- Updates/cancels in Assembla update external copies when sync exists  

### Step 4 — Onsite execution

- Sign TL in; F&B accept/decline  
- CDA / contract signature when applicable  
- Outcomes: occurred, canceled, no show, **walk-in**  
- Soft early/late vs scheduled window  

---

## Mapping to current product

| Concept | Today | Next |
|---|---|---|
| Congress calendar | Congress owns appointments/rooms | Day + rooms views |
| Room resource | `Room` + conflicts | Open hours; rooms-first UI |
| Booth/vendor | Guide markdown | `StaffShift` |
| Roles | Org roles + attendee kinds | Meeting participant roles |
| Types | Partial `EngagementType` | Expand + contracted/CDA subtypes |
| Step 1 | `MeetingRequest` + Console intake | ECCO import / offered slots later |
| Step 2 | Book appointment | + holds, comments, offered times |
| Step 3 | Deferred | T7 outbound |
| Step 4 | Check-in + outcomes | + F&B, walk-in, CDA |

---

## Near-term build order (do this)

1. **T0** — Reschedule + conflict parity + show meeting time at check-in  
2. **T0.5** — `MeetingRequest` intake (Step 1)  
3. **T1** — Congress timezone (required)  
4. **T1.5** — Room open hours  
5. **T2** — Pending placement (kill +24h placeholder)  
6. **T4 rooms-first** — Resource calendar UI  
7. **T3** — Check-in window flags + no-show assist  
8. **T5** — ICW via appointments + invite gate  
9. **T7** — Outbound calendar invites last  

---

## Raw stakeholder notes

> Each Congress would function as its own calendar, where all activities and engagements would live.  
> Each room/venue would be its own space.  
> Each congress calendar would host a booth staffing schedule and vendor schedule.
>
> Meeting Room Schedule — each room is a resource that can be reserved; most rooms have set days and hours.
>
> Roles: Scheduler, Meeting Requester, Meeting Owner (MO), Thought Leader (TL), MSL, TLL, Internal Attendee, External TL.
>
> Types: Ad Boards, TL Meeting, Informal, Formal, Offsite, TL Dinner, HCP Reception, Symposium Speaker.
>
> Step 1 Request → Step 2 Schedule → Step 3 Calendar invite → Step 4 Onsite (F&B, CDA, occurred/canceled/no show/walk in).
