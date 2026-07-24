# Check-in corrections

Signed ToV / signature records are **not** edited in place.

1. `POST /organizations/:orgId/check-ins/:checkInId/void` with `{ "reason": "..." }`
2. `POST /organizations/:orgId/check-ins` with the corrected payload and `replacesCheckInId` set to the voided check-in id

Both rows remain in the export for audit. Active operational counts use non-voided rows.
