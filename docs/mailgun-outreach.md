# Mailgun outreach

Local/dev sends use Mailgun credentials in `apps/api/.env` (never commit real keys).

| Variable | Purpose |
|---|---|
| `MAILGUN_API_KEY` | Mailgun private API key |
| `MAILGUN_DOMAIN` | Sending domain |
| `MAILGUN_FROM` | From header |
| `MAILGUN_TEST_TO` | When set, **all** outbound mail is redirected here; intended recipient is prefixed in the subject as `[test→email@…]` |
| `MAILGUN_DRY_RUN` | `true` skips the provider call (CI/tests) |

Default test inbox for this project: `tdturn2@gmail.com`.

## Flow

1. Create template (merge fields: `{{name}}`, `{{email}}`, `{{institution}}`, `{{congress}}`, `{{organization}}`)
2. Create campaign with KOLs that have emails
3. Send campaign → invitations emailed via Mailgun
4. Recipient opens `/rsvp/:token` (or tracking pixel marks opened)
5. Accept creates a draft appointment when the campaign has a congress; decline records status only
