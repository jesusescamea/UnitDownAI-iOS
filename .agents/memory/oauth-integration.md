---
name: OAuth Calendar/Email integration
description: Architecture and key decisions for Outlook + Google OAuth in Dispatch Inbox
---

## Routes
- `/api/integrations/outlook/*` and `/api/integrations/google/*`
- Auth: `clientId` query-param (same pattern as van, scheduledEvents, units — NOT Bearer/Clerk middleware)
- Callback routes have NO auth — userId embedded in HMAC-signed state param

## DB
- Table: `oauth_tokens` with deterministic PK `ot_{userId}_{provider}`
- Upsert: `onConflictDoUpdate` on PK
- Tokens AES-256-GCM encrypted with `TOKEN_ENCRYPTION_KEY` (SHA-256 hashed to 32 bytes)
- Requires `TOKEN_ENCRYPTION_KEY`, `MICROSOFT_CLIENT_ID/SECRET/REDIRECT_URI/TENANT_ID`, `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`

## Frontend flow
1. Frontend calls `/auth-url?clientId=user_xxx` → gets OAuth URL
2. Opens URL in popup (`window.open`)
3. Listens for `postMessage({ type: 'oauth_success', provider })` from popup
4. Falls back to polling popup.closed every 1500ms
5. Re-polls `/status` on close/message

## Configured/Connected pattern
- When env vars missing: `/status` → `{ configured: false, connected: false }`
- Frontend OAuthConnectScreen shows "Direct sync requires setup" + fallback options — NO "Authentication not configured" wording
- When configured but not connected: shows "Connect [Provider]" button
- When connected: shows fetch button → event/email list with "Import" per item

## Routing in DispatchInboxModal
- `google_calendar` / `gmail` → `screen='google_connect'` with `connectImportType='calendar'|'email'`
- `outlook_calendar` / `outlook_email` → `screen='outlook_connect'`
- `apple_calendar` → still `screen='calendar_alt'` (Apple has no web OAuth)

## Parser additions (parsers.ts)
- `calendarEventToImportedJob(event, source)` — handles both Graph/Google event shapes
- `emailToImportedJob(message, source)` — tries parsePastedText, falls back to basic job
- These are placed at TOP of parsers.ts; safe because all helper functions use `function` declarations (hoisted)

**Why clientId not Clerk middleware:**
The callback comes from Microsoft/Google (no Clerk cookies), so `/callback` uses state verification. All other integration routes use clientId to stay consistent with the rest of the non-Clerk routes in this codebase.

**Setup docs:** `artifacts/api-server/INTEGRATIONS_SETUP.md`
