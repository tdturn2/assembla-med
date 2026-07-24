# CVENT-oriented CSV self-import (buyer-owned)

Assembla can export a **CVENT-oriented** CSV of non-voided check-ins. Your team imports it while logged into CVENT. Assembla never needs your login.

## Steps

1. In Console → Congress → download **CVENT-oriented CSV** (or API `.../export/check-ins-cvent`).
2. Open the file; confirm headers match your provisional mapping ([cvent-field-mapping.md](./cvent-field-mapping.md)).
3. In CVENT (as your admin), use your normal import / bulk update path for the agreed object.
4. Keep Assembla as source of truth for signatures and void/correct; re-export after corrections.

## Limits

- Column names are **provisional** until sandbox confirms the real import template.
- Voided check-ins are excluded.
- This is an operational bridge, not a live API integration.
