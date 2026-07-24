# CVENT buyer questionnaire (no shared credentials)

Ask the buyer’s ops / compliance / IT to answer and attach **redacted** artifacts. Do **not** request CVENT usernames, passwords, or API keys.

## Questions

1. Which CVENT object should congress attendance land on (event registration, session check-in, custom activity, other)?
2. Where does Transfer of Value (ToV) live today (CVENT field, adjacent finance system, spreadsheet)?
3. Required fields for a valid ToV / attendance record in your process?
4. Picklist values for ToV type / engagement type if they must match yours?
5. How do you identify an HCP uniquely (email, NPI, internal ID)?
6. After contract, will IT allow (a) org-scoped API credentials entered in Assembla Console, or (b) export-only / they-pull handoff?

## Optional attachments (redact PII)

- Screenshot of the screen where attendance or ToV would appear (empty is fine)
- CSV export **headers only** (or one fully redacted sample row) from a comparable report
- Internal SOP snippet naming the system of record for ToV

## What we do with answers

Update [cvent-field-mapping.md](./cvent-field-mapping.md) confidence from `assumed`/`unknown` → `confirmed` where possible. Live push validation waits for a **customer-controlled** sandbox after signature ([integration-secrets.md](./integration-secrets.md)).
