---
name: Job Mode offline-first architecture
description: Key decisions for the offline-first sync queue in Job Mode — ID strategy, IndexedDB queue, backend idempotency, AI fallback.
---

## Rule
Client-generated permanent IDs from the start — never temp IDs that need swapping after server confirmation.

**Why:** Temp ID swapping (tmp_→real_) is fragile: if the swap races with a page reload or a second sync attempt, UI state can split. Permanent IDs let the server use `onConflictDoNothing` and the client never needs to track a mapping.

**How to apply:** Use `clientId(prefix)` (same format as server: `${prefix}_${Date.now()}_${random36}`). Pass the ID as `id` in every create payload. Backend accepts optional `id` on both `/jobs` and `/jobs/:jobId/events`.

---

## Sync queue
- **Store:** IndexedDB via `idb` package, `unitdown_offline` DB, `sync_queue` + `blobs` stores.
- **File:** `artifacts/unitdown-ai/src/services/jobOfflineDB.ts`
- **Ops:** `create_job | patch_job | create_event | patch_event | delete_event | upload_photo`
- **Flush trigger:** `window online` event + 3s debounce after every write.
- **Retry:** `markOpFailed` increments `retries` + stores `lastError`; queue is NOT cleared on error so retries persist across reloads.

## Backend idempotency
Both `POST /jobs` and `POST /jobs/:jobId/events` use `db.insert(...).onConflictDoNothing()` followed by a `SELECT` to return the row regardless of whether insert or conflict path was taken. This means duplicate sync attempts (network timeout + retry) are harmless.

## AI fallback
`VoiceNoteModal` checks `isOnline` from `useJobMode()` before calling `/api/ai/voice/interpret`. When offline: saves immediately with `metadata.ai_pending = true` and skips interpretation. The `"offline_saved"` phase shows a clear message. Future: a background job can process `ai_pending` events when connection returns.

## Status indicator
`OfflineStatusBar` covers 5 states: `offline | syncing | error (tappable retry) | pending (N items) | idle (synced)`. `OfflineBanner` is a full-width red strip shown at top of active job header when offline. Both live in `artifacts/unitdown-ai/src/components/job/OfflineStatusBar.tsx`.

## SyncStatus type
```
"idle"    = online + fully synced
"syncing" = flushing queue
"pending" = queue not empty, will flush
"error"   = last flush had failures
"offline" = no network
```
Derived in `JobModeProvider` from `isOnline`, `isFlushingRef`, and `lastSyncError` — not stored in reducer.
