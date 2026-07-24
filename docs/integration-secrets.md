# Integration secrets (post-contract)

## Policy

- Never collect CVENT user passwords.
- Never accept API secrets over Slack/email.
- Buyer or their IT enters sandbox/production credentials into Assembla **org settings** (or refuses storage and chooses export-only).

## Target model (not fully built yet)

When CVENT sandbox is available:

| Piece | Intent |
|---|---|
| `IntegrationCredential` (org-scoped) | Encrypted `clientId` / `clientSecret` / token metadata; `provider=cvent`; `environment=sandbox\|production` |
| Encryption | App-level key from env (`INTEGRATION_SECRETS_KEY`); ciphertext only in DB |
| Console UI | Org admin pastes values, sees last-4 / rotated-at, can clear |
| Runtime | `CventAdapter` reads org credentials; never logs secrets |
| Fallback | If IT forbids third-party secret storage → CSV / SFTP / they-pull only; Assembla remains capture system |

## Pre-contract

Destination is always `mock`. No org secrets UI required for demos.
