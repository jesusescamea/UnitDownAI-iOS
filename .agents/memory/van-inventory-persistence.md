---
name: Van inventory persistence pattern
description: How van_inventory and tool_checklist are persisted, seeded, and accessed from MyVanModal.
---

## DB tables
- `van_inventory`: id, user_id, item_name, category, qty, min_qty, unit, is_active, created_at, updated_at
- `tool_checklist`: id, user_id, tool_name, category, has_item, notes, created_at, updated_at
- Both in `lib/db/src/schema/` (vanInventory.ts, toolChecklist.ts), exported from index.ts

## API routes (`artifacts/api-server/src/routes/van.ts`)
- Auth via `clientId` query/body param (same as units.ts, NOT Bearer token / req.auth)
- `GET /api/van/inventory?clientId=user_xxx` — list active items
- `POST /api/van/inventory/bulk` — seed defaults if user has zero rows (idempotent)
- `PATCH /api/van/inventory/:id?clientId=user_xxx` — update qty
- `DELETE /api/van/inventory/:id?clientId=user_xxx` — soft-delete (is_active=false)
- `GET /api/van/tools?clientId=user_xxx` — list tools
- `POST /api/van/tools/bulk` — seed defaults if user has zero rows
- `PATCH /api/van/tools/:id?clientId=user_xxx` — update hasItem

## Frontend (MyVanModal.tsx in /jmp/ prototype)
- Uses `useUser()` from Clerk for `user.id` as the clientId
- On mount: loads from API; if empty, seeds from INITIAL_INVENTORY; merges persisted qty into rich local template
- On qty change: `persistQty()` is fire-and-forget — local state is the reactive source of truth, API persists across sessions
- Offline-safe: API errors are caught silently; local INITIAL_INVENTORY is the fallback

## Equipment Memory endpoint
- `GET /api/units/:id/memory?clientId=user_xxx` (in units.ts)
- Joins job_timeline_events → jobs → filters by unit_id + user_id
- Returns: repeatedParts (same part in 2+ jobs), memoryFacts (from metadata.memoryExtracts), chronicAlarms (alarm code 2+ times)
- Latest job's memoryExtracts override earlier ones for the same key

**Why:** Inventory items have rich frontend metadata (AI tags, substitutes, job compatibility lists) that is too large and too frontend-specific to store in the DB. The DB only persists the mutable quantity field; the template data lives in vanData.ts.
