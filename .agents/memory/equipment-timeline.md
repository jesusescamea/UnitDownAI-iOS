---
name: Equipment Timeline architecture
description: How the equipment_timeline table and GET endpoint work together, and why diagnostic events are virtual.
---

## Rule
The `equipment_timeline` DB table stores ONLY manually-created entries (repair, note, maintenance, scan).  
Diagnostic events (`eventType: "diagnostic"`) are **never stored** in that table — they are synthesized at query time from `diagnostic_logs` where `unit_id = $unitId`.

The GET `/api/units/:unitId/timeline` handler:
1. Queries `equipment_timeline` for manual rows
2. Queries `diagnostic_logs` for rows with matching `unit_id`
3. Maps each log → a virtual event object with `id: "diag_${log.id}"` and `source: "log"`
4. Merges + sorts newest-first before returning

**Why:** Storing a copy of each diagnostic as a timeline entry would require a sync hook on every diagnostic status change. The virtual approach keeps a single source of truth (`diagnostic_logs`) and the timeline GET is the only merge point.

**How to apply:** If you ever add a new field to `diagnostic_logs` that should surface in the timeline (e.g. `resolutionNotes`), update the synthesis map in `artifacts/api-server/src/routes/timeline.ts` GET handler. Do NOT add a new write to `equipment_timeline` from the diagnostic routes.

## Source field
- `source: "log"` — auto-generated from a diagnostic log; the client hides the Delete button and links to `/logs/:id`
- `source: "manual"` — user-created entry; client shows Delete button
