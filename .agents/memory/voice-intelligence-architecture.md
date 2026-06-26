---
name: Voice Intelligence 2.0 architecture
description: Architecture for the HVAC voice intelligence pipeline — new endpoint, single AI call, learning engine.
---

## Rule
Use `/api/ai/voice/interpret` (not `/api/ai/polish`) for voice recordings. The existing `/api/ai/polish` powers AIPolishPanel and must remain untouched.

**Why:** Voice intelligence needs a richer response shape (3 versions + confidence + uncertainPhrases + memoryExtracts) that would break the existing AiPolishResponse contract.

## How to apply
- New voice mic features → call `voiceInterpret` from `@workspace/api-client-react`
- Existing text-polish buttons (AIPolishPanel) → call `aiPolish` / `useAiPolish`
- Never merge the two — they serve different UX flows

## Key design decisions
- Single GPT call with `response_format: { type: "json_object" }` returns all 3 documentation versions in one round-trip
- HVAC dictionary injected as system prompt segment from `hvacDictionary.ts` — expand that file to grow the vocabulary
- Per-user learning stored in `localStorage` under `unitdown_voice_corrections` as `{original, preferred, count}[]`; sent as `userCorrections` in the request body
- Phrase override UI: "accept" (default, use AI suggestion) vs "keep" (restore original word in the saved text)
- Safety fallback: if AI returns malformed JSON, route returns the raw transcript in all 3 fields with confidence=50

## Files
- `artifacts/api-server/src/data/hvacDictionary.ts` — HVAC vocabulary + speech corrections (expand here)
- `artifacts/api-server/src/routes/voiceInterpret.ts` — route handler with inline Zod validation
- `artifacts/unitdown-ai/src/components/VoiceNoteRecorder.tsx` — 3-tab UI (Professional default), confidence badge, phrase review, memory extracts accordion
