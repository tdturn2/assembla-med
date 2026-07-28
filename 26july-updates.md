# July 26 feedback — second-round plan

Raw notes from first-round review are below. Implementation order:

## Slice 1 — Congress hub polish (done)
- Congress tiles: name, CVENT ID, company contact
- Congress detail chrome uses congress name (not generic “Congress”)
- Structured Event Guide: booth schedule, exhibit hall hours, staff directory
- ICW sections (dinners, reception, ad boards, work room, meeting rooms)
- Disclosures with optional content links (Lilly-style)

## Slice 2 — Rooms v1 (done)
- `Room` model (title, sitting, AV, layout, capacity, supply notes)
- Book appointments against rooms; room + person availability

## Slice 3 — Management tab (done)
- Badge printing stub, attendance counts
- Mark appointments Occurred / No Show / Cancel
- CVENT status update shortcut (reuse mock push + CSV)

## Slice 4 — Nav combine (done)
- Congress hub embeds / deep-links check-in
- Appointments + Outreach → Engagements surface

## Defer
- Local AI conversation tracking, live CVENT API, calendar sync, SSO/MFA, congress scrape, push notifications

## Time / calendaring (next)

See **[docs/calendaring-roadmap.md](./docs/calendaring-roadmap.md)** and locked decisions in **[congress-calendar.md](./congress-calendar.md)**.

**Bet:** Assembla = source of truth; **rooms-first** resource calendar; `MeetingRequest` → appointment; Outlook invite outbound last.

**Build order:** T0 ✓ → T0.5 ✓ (`MeetingRequest`) → T1 (timezone) → T1.5 (room hours) → T2 (real slots) → T4 rooms UI → T3 check-in window.

---

## Raw feedback

What if we combined Congresses & Check In

Then Combine KOL's Appointments, and Outreach?

Congress Creation

Make congress tiles, with Congress Name, CVENT ID, Company Contact

Congress Specific Page

Change "Congress" to actual Congress Name

App
- App Editing
- App Notification

Booth
- Booth Schedule
- Exhibit Hall Hours
- Staff Directory

Congress
- Congress Website- can congress scrape?
- Congress Schedule

Meetings-> Appointments
- Schedule
- "Add Rooms"- Room Title, Sitting, AV, Room Layout etc.
- Display Room Availability
- Display Person Availability
- Room Layout
- Supply List

ICW
- Dinners- Time and Location (Map Link) [Only for those invited]
- Reception- Time and Location
- Ad Boards- Time Location [Only for those invited]
- Work Room- Time, Location, and amenities [if any]
- Meeting Rooms- Time, Location, Meeting Owner (Who can add meetings) [if any]

Disclosures
Presenting information like this https://www.lilly.com/hcp/congresses/ddw-2026
Would ideally have links to the content
Logistics

Attendee
- Information from CVENT
     - Attendee Name
     - Contact Number
     - Hotel Check In/Out

Move gallery to top. Add "Add KOI"- with create profile and import option.
Therapeutic Drop down
- Add ongoing threads

Appointments & Outreach combine
Ability to invite KOL to HCP receptions.
Meetings?
Local AI that tracks the conversation?
Ability to choose from template repsonse

Add Management Tab on the right
- Name Badge Printing
- Attendance Count
- Update CVENT Meeting Status
- Check in Appointments and mark as Occurred, No Show, Cancel
