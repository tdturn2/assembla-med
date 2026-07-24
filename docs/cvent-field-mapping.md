# CVENT field mapping (provisional)

**Status:** Provisional — not validated against a customer CVENT sandbox.  
**Credentials:** Assembla never needs buyer CVENT logins. Refine this doc from public docs + buyer-provided **redacted** screenshots/export headers only.

## Assembla → intended CVENT targets

| Assembla field | Source | Intended CVENT / CRM target | Confidence |
|---|---|---|---|
| `check_in.id` | Check-in | External / source system ID (custom field or note) | assumed |
| `check_in.idempotency_key` | Derived `check_in:{id}` | Dedup key for push retries | assumed |
| `appointment.checkInCode` | Appointment | Session / activity reference | unknown |
| `congress.name` | Congress | Event name (match existing event) | assumed |
| `attendee_name` | Check-in | Contact / attendee display name | assumed |
| `attendee_email` | Check-in | Contact email | assumed |
| `kol.name` / `kol.email` | KOL | HCP / contact if different from attendee | assumed |
| `checked_in_at` | Check-in | Attendance / activity timestamp | assumed |
| `tov_amount` | Check-in | Transfer of Value amount | assumed |
| `tov_currency` | Check-in | Currency code | assumed |
| `tov_type` | Check-in | ToV category (meal, etc.) — map to their picklist | unknown |
| `signature_status` / `signature_key` | Check-in | Evidence pointer (URL or “signed in Assembla”) | unknown |
| `appointment.engagement_type` | Appointment | Activity type | unknown |
| `appointment.is_contracted` | Appointment | Contracted flag / custom field | unknown |
| `voided_at` / `void_reason` | Check-in | Do not push voided rows; corrections use replacement check-in | confirmed (Assembla rule) |

Confidence key: `confirmed` (agreed) · `assumed` (reasonable default) · `unknown` (needs sandbox / buyer artifact).

## Buyer artifacts that help (no passwords)

See [cvent-buyer-questionnaire.md](./cvent-buyer-questionnaire.md).

## Demo destination today

Pushes go to Assembla’s **mock destination** (`integration_destination=mock`). UI label: *Simulated destination (CVENT sandbox pending)*. Do not describe this as synced to CVENT.
