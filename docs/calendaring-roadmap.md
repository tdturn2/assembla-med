# Calendaring / time roadmap

Time is a **cornerstone** of Assembla Med: congress days, meeting slots, rooms, who is on which meeting, check-in relative to that slot, and later external calendars. This doc is the plan forward for the **internal clock** first; Outlook/Google sync comes last.

**Product decisions:** [congress-calendar.md](../congress-calendar.md) (locked).  
Related: [initial-plan.md](../initial-plan.md), [26july-updates.md](../26july-updates.md), planning canvas `calendaring-cornerstone`.

---

## 1. Principles

1. **One source of truth** — Assembla `Appointment` (UTC `startTime` / `endTime`); Outlook/Google are outbound only.
2. **Venue clock** — congress timezone required; storage stays UTC.
3. **Conflict parity** — Console, meeting-request confirm, outreach accept, and later imports share one conflict engine.
4. **Rooms-first calendar** — primary Console view is a resource calendar (time × rooms); congress day grid and “Mine” are secondary.
5. **Request → schedule → invite → onsite** — `MeetingRequest` before a hard slot when coming from planners; walk-ins can skip to confirmed.
6. **Lists → resource/day views → sync** — no external calendar integration on placeholder slots.

---

## 2. Current state (baseline)

| Layer | Status | Notes |
|---|---|---|
| Congress date window | Done | `startDate` / `endDate` (date-only) |
| Appointment slots | Done | UTC start/end, status, engagement type, room, KOL |
| People on a meeting | Done | Attendees + RSVP + primary |
| Rooms v1 | Done | Inventory, book, availability API, room conflicts |
| Conflict engine | Partial | KOL + creator + room; not all attendees; outreach accept bypasses |
| Console / Event schedule UI | Partial | Chronologic lists; no day/resource grid; little reschedule UX |
| Timezone | Gap | UTC + browser `toLocale*`; no congress TZ |
| Meeting request intake | Missing | Step 1 not modeled |
| Room open hours | Missing | Rooms lack bookable days/hours |
| Outreach → appointment | Partial | Accept creates +24h / 30min placeholder |
| Check-in vs slot | Partial | Linked by code; no window validation; time not prominent |
| Booth / vendor shifts | Missing | Guide markdown only |
| Meeting participant roles | Missing | Org roles only (`admin`/`rep`/`viewer`) |
| ICW / agenda | Partial | Markdown guides, not timed/gated rows |
| External calendar sync | Deferred | Outlook / Google / `.ics` |

---

## 3. Locked product decisions (summary)

| Topic | Decision |
|---|---|
| Source of truth | Assembla |
| Primary UI | Rooms-first resource calendar |
| Intake | `MeetingRequest` → appointment; walk-in allowed |
| Booth staffing | Separate `StaffShift` |
| Meeting roles | Per-appointment (Scheduler, MO, MSL, TLL, …) |
| ICW | Reuse appointments + invite gate |
| Check-in outside window | Soft warn, don’t block |
| RSVP accept | Pending placement (no fake slot) |
| Congress TZ | Required IANA string |
| “Mine” | Creator **or** staff attendee |

Full write-up: [congress-calendar.md](../congress-calendar.md).

---

## 4. Forward plan (phases)

Each phase has a **goal**, **ship list**, and **exit criteria**. Do not start the next phase until exit criteria pass (or are explicitly waived).

### T0 — Trust the clock (foundation)

**Goal:** Every create/move path is consistent; planners can fix time/room in Console.

| Work | Detail |
|---|---|
| Reschedule UX | Edit appointment start/end/room/status in Console (not create-only) |
| Conflict parity | Accept leaves invitation pending placement (no fake +24h slot); real booking goes through Console conflict checks |
| Attendee conflicts | On create/update/add-attendee, conflict-check **all** KOL attendees (not only primary) |
| Show scheduled time | Appointment lists + check-in lookup show the meeting window |

**Exit criteria**

- [x] Planner can change time/room without recreating the appointment
- [x] Accepting an invite cannot double-book a KOL/room that Console would reject
- [x] Extra KOL attendees on a roster participate in conflict checks
- [x] Check-in screen shows scheduled start–end for the looked-up appointment

---

### T0.5 — Meeting request intake (Step 1)

**Goal:** Capture demand before a hard slot.

| Work | Detail |
|---|---|
| `MeetingRequest` model | TL contacts, type, topic, contracted/CDA flags, length, AV, cost center, comments, attendees |
| Console intake | Create/list requests; convert → appointment when scheduled |
| Statuses | `submitted` → `scheduling` → `scheduled` / `withdrawn` |

**Exit criteria**

- [ ] Requester can submit without choosing room/time
- [ ] Scheduler can promote a request to an appointment (T0 conflict rules apply)

---

### T1 — Congress timezone

**Goal:** One venue timezone for the event; UI books and displays against it.

| Work | Detail |
|---|---|
| Schema | `Congress.timezone` (IANA, **required** for new congresses) |
| Booking | Console inputs in congress TZ → stored UTC |
| Display | Event App + Console format in congress TZ |

**Exit criteria**

- [ ] Same appointment shows the same wall time for planners and booth staff in congress TZ
- [ ] Changing browser TZ does not silently shift the booked slot on save
- [ ] API still stores/returns ISO UTC

---

### T1.5 — Room open hours

**Goal:** Rooms only bookable inside declared windows.

| Work | Detail |
|---|---|
| Schema | Per-room weekly hours and/or congress-day overrides |
| Validation | Reject appointments outside open hours |
| Availability API | Respect hours + existing bookings |

**Exit criteria**

- [ ] Cannot confirm a meeting in a closed room window
- [ ] Rooms availability UI shows closed vs busy vs free

---

### T2 — Booking from outreach / requests (real slots)

**Goal:** Stop inventing placeholder meetings on RSVP accept.

| Work | Detail |
|---|---|
| Pending placement | Accept → needs scheduling (link request or pending appointment **without** fake +24h time) |
| Offered slots (v1.1) | Optional proposed windows; TL picks one |
| Planner queue | Accepted invites + open requests awaiting room/time |
| Holds | `pending` status = soft hold until confirmed |

**Exit criteria**

- [ ] No automatic +24h / 30min appointment on accept
- [ ] Accepted invites / requests appear in a scheduler queue
- [ ] Conflicts enforced when the real slot is set

---

### T3 — Check-in aligned to time

**Goal:** Attendance ops respect the scheduled window.

| Work | Detail |
|---|---|
| Context | Always show meeting time + room on check-in |
| Early / late | **Soft** indicators vs congress TZ (± grace) |
| F&B | Accept/decline at check-in (Step 4) |
| Walk-in | Create/confirm onsite without prior request |
| Suggest outcome | Offer “Mark occurred” after check-in |
| No-show assist | Post-window confirmed meetings with no active check-in |

**Exit criteria**

- [ ] Staff see scheduled window before ToV
- [ ] Outside-window check-in warns but still allowed
- [ ] Management can list likely no-shows

---

### T4 — Calendar surfaces (rooms-first)

**Goal:** Feel like a congress calendar without external sync.

| Work | Detail |
|---|---|
| **Rooms resource calendar** | Primary Console view: time × room lanes for one congress |
| Congress day/week | Secondary: all engagements |
| Event App day groups | Company / Mine grouped by congress day |
| Deep links | Cell → appointment / check-in code |

**Exit criteria**

- [ ] Ops can see room contention without a spreadsheet
- [ ] Field staff can answer “what’s next this afternoon?” via day groups

---

### T5 — ICW + engagement types

**Goal:** Dinners / receptions / ad boards as timed, gated appointments.

| Work | Detail |
|---|---|
| Expand `EngagementType` | Ad board, dinner, reception, symposium, offsite, formal/informal, … |
| Invite gate | Event App visibility for invitees (+ staff roles) |
| Participant roles | Scheduler, MO, MSL, TLL on appointment |
| Maps | Optional `mapUrl` |

**Exit criteria**

- [ ] Invite-only ICW items hidden from non-invitees
- [ ] ICW items appear on rooms/day calendars with real start/end

---

### T6 — Staff shifts, buffers, satellite (Core+)

**Goal:** Booth/vendor + planning polish.

| Work | Detail |
|---|---|
| `StaffShift` | Booth / vendor schedule on congress calendar |
| Buffers | Optional gap between meetings for same KOL/room |
| Satellite meetings | Linked appointments |
| Layout visuals | Beyond free-text layout/supply |

**Exit criteria**

- [ ] Booth shifts visible without polluting TL meeting conflict rules (unless same person double-booked by policy)
- [ ] Buffer setting prevents back-to-back when enabled

---

### T7 — External calendar sync (last)

**Goal:** Step 3 “send calendar request” without ceding source of truth.

| Work | Detail |
|---|---|
| `.ics` export | Per appointment / “my schedule” |
| Outlook / Google | **Outbound** create/update with idempotent external IDs |
| Inbound | Deferred |
| Permissions | Org-scoped OAuth |

**Exit criteria**

- [ ] Invite recipients get TL, MO, internal & external attendees
- [ ] Assembla cancel/reschedule updates or tombstones external copies
- [ ] Sync failures visible in Console

---

## 5. Explicitly out of scope (for now)

- Outlook/Google as system of record  
- Bidirectional CRM/calendar as a launch claim  
- AI conversation → schedule  
- Congress website scrape as schedule truth  
- Replacing CVENT as enterprise calendar of record  

---

## 6. Sequencing

**Near-term (do in order):** **T0 → T0.5 → T1 → T1.5 → T2 → T4 (rooms) → T3**  

Then T5 (types/roles/ICW), T6 (booth shifts), T7 (outbound invites).

| Parallel OK | Blocked on time work |
|---|---|
| CVENT **read** into rooms/attendees | CVENT **write** of meeting times |
| Badge polish | Auto no-show without T3 |
| KOL profile fields | People-resource calendar (after rooms view) |

---

## 7. Success definition

Time is “done enough” for the next buyer demo when:

- Congress has timezone + rooms with open hours  
- Requests flow into scheduled appointments without junk slots  
- Rooms-first calendar shows contention  
- Booth staff see day-grouped schedule + meeting window at check-in  
- Outcomes: occurred / no show / cancel / walk-in  

External calendar send is a **follow-on**, not the definition of success.
