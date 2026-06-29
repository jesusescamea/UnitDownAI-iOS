# Calendar & Email OAuth Integration Setup

UnitDown supports direct calendar and email sync via Microsoft Outlook and Google. This document covers how to configure, test, and operate these integrations.

---

## Overview

| Provider | Calendar | Email | Protocol |
|----------|----------|-------|----------|
| Microsoft Outlook | ✅ Calendars.Read | ✅ Mail.Read | OAuth 2.0 (MSAL) |
| Google | ✅ calendar.readonly | ✅ gmail.readonly | OAuth 2.0 (PKCE not required) |
| Apple Calendar | File (.ics) only | — | No web OAuth |

When env vars are not set, the `/status` endpoint returns `{ configured: false, connected: false }` and the frontend shows graceful fallback options. No error is thrown.

---

## Required Environment Variables

### Token Encryption (required for both providers)

| Variable | Description |
|----------|-------------|
| `TOKEN_ENCRYPTION_KEY` | Arbitrary secret string — tokens are AES-256-GCM encrypted at rest using a SHA-256 hash of this value. Must be set before any OAuth connection is attempted. |

### Microsoft Outlook

| Variable | Description |
|----------|-------------|
| `MICROSOFT_CLIENT_ID` | Application (client) ID from Azure portal |
| `MICROSOFT_CLIENT_SECRET` | Client secret from Azure portal |
| `MICROSOFT_REDIRECT_URI` | Must match the redirect URI registered in Azure. Example: `https://unitdown.org/api/integrations/outlook/callback` |
| `MICROSOFT_TENANT_ID` | (optional) Defaults to `"common"`. Use your tenant ID for single-tenant apps. |

### Google

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret |
| `GOOGLE_REDIRECT_URI` | Must match the authorized redirect URI. Example: `https://unitdown.org/api/integrations/google/callback` |

---

## Microsoft Azure Setup

1. Go to **Azure Portal → Entra ID → App registrations → New registration**
2. Set redirect URI to `https://unitdown.org/api/integrations/outlook/callback`
3. Under **Certificates & secrets** → create a new client secret
4. Under **API permissions** add:
   - `Calendars.Read` (delegated)
   - `Mail.Read` (delegated)
   - `offline_access` (delegated)
   - `User.Read` (delegated)
5. Grant admin consent if required by your tenant
6. Copy the **Application (client) ID** and **secret value** into env vars

---

## Google Cloud Setup

1. Go to **Google Cloud Console → APIs & Services → OAuth consent screen**
   - Set User Type to **External** (or Internal for GSuite)
   - Add scopes: `calendar.readonly`, `gmail.readonly`
2. Go to **Credentials → Create credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URI: `https://unitdown.org/api/integrations/google/callback`
3. Copy the client ID and secret into env vars
4. Enable APIs:
   - Google Calendar API
   - Gmail API

---

## API Endpoints

All endpoints are under `/api/integrations/{provider}/` where `{provider}` is `outlook` or `google`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/status?clientId=user_xxx` | clientId | Returns `{ configured, connected }` |
| `GET` | `/auth-url?clientId=user_xxx` | clientId | Returns OAuth authorization URL |
| `GET` | `/callback` | none (state-verified) | OAuth callback — stores tokens, returns HTML |
| `GET` | `/calendar/events?clientId=user_xxx` | clientId | Fetches next 30 days of events |
| `GET` | `/mail?clientId=user_xxx` | clientId | Fetches last 7 days of emails |
| `DELETE` | `/disconnect?clientId=user_xxx` | clientId | Revokes and deletes stored tokens |

### Auth pattern
All endpoints except `/callback` use the `clientId` query parameter (Clerk user ID, e.g. `user_abc123`). This is the same pattern used by `/api/units`, `/api/van-inventory`, and `/api/scheduled-events`.

---

## Token Storage

Tokens are stored in the `oauth_tokens` PostgreSQL table:

```sql
SELECT id, user_id, provider, expires_at, updated_at FROM oauth_tokens;
```

- `access_token` and `refresh_token` are AES-256-GCM encrypted using `TOKEN_ENCRYPTION_KEY`
- The deterministic `id` is `ot_{userId}_{provider}` — upserted on reconnect
- Tokens are auto-refreshed 5 minutes before expiry on any calendar/mail fetch
- A 401 from the provider API deletes the stored token and returns HTTP 401 to the frontend

---

## OAuth Flow (Frontend → Backend)

```
1. User taps "Connect Outlook" in Dispatch Inbox
2. Frontend: GET /api/integrations/outlook/auth-url?clientId=user_xxx
3. Backend: generates signed state (HMAC-SHA256), returns MS authorization URL
4. Frontend: opens URL in popup window
5. User: signs in with Microsoft credentials, grants permissions
6. Microsoft: redirects to /api/integrations/outlook/callback?code=...&state=...
7. Backend: verifies HMAC state, exchanges code for tokens, encrypts, upserts to DB
8. Backend: returns success HTML that calls window.postMessage and window.close()
9. Frontend: detects postMessage or popup close, re-polls /status, shows connected state
10. Frontend: fetches calendar events or emails
```

---

## Security Notes

- **State parameter**: HMAC-SHA256 signed with `TOKEN_ENCRYPTION_KEY`. Verified on callback to prevent CSRF.
- **Token encryption**: AES-256-GCM. IV and auth tag are stored alongside ciphertext.
- **Token revocation**: Google tokens are revoked at `https://oauth2.googleapis.com/revoke` on disconnect. Microsoft tokens expire naturally.
- **401 handling**: A 401 from the provider API clears the stored token row, forcing re-authentication.
- **No server-side redirect URL flexibility**: The redirect URI is fixed in the env var and in the provider app registration. Users cannot influence it.

---

## Development vs. Production

In development (Replit preview):
- Set `MICROSOFT_REDIRECT_URI` to `https://<your-replit-dev-domain>/api/integrations/outlook/callback`
- Set `GOOGLE_REDIRECT_URI` to `https://<your-replit-dev-domain>/api/integrations/google/callback`
- Add these redirect URIs to your Azure/Google app registration

In production (`unitdown.org`):
- `MICROSOFT_REDIRECT_URI=https://unitdown.org/api/integrations/outlook/callback`
- `GOOGLE_REDIRECT_URI=https://unitdown.org/api/integrations/google/callback`

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `configured: false` on `/status` | Env vars missing | Set all required env vars and restart server |
| Popup opens but immediately closes with error | Redirect URI mismatch | Ensure `MICROSOFT_REDIRECT_URI` / `GOOGLE_REDIRECT_URI` matches registration |
| `Token exchange failed` in callback | Wrong client secret | Verify `MICROSOFT_CLIENT_SECRET` or `GOOGLE_CLIENT_SECRET` |
| 401 on `/calendar/events` | Token expired, refresh failed | User must reconnect. Check if refresh token was stored (requires `offline_access` scope for MS, `access_type=offline` for Google) |
| Events/emails list empty | No data in range | Normal. MS: next 30 days of calendar. Google: same. Gmail: last 7 days. |
| `TOKEN_ENCRYPTION_KEY` changed | All stored tokens are now unreadable | All users must reconnect. Change this key only when rotating after a breach. |
