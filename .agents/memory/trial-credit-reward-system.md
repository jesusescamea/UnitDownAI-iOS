---
name: Trial + credit + reward system
description: Architecture decisions for the 7-day Pro Trial, diagnostic credits, and one-time onboarding rewards replacing the "5 free diagnoses" model.
---

# Trial + Credit + Reward System

## Core model
- Authenticated users (Clerk `user_xxx` IDs) get a 7-day Pro Trial with 25 diagnostic credits on first login.
- Unauthenticated users still get the old session-cookie / fingerprint / IP free-use path (no change).
- Pro subscribers bypass all trial/credit logic entirely.

## DB: `user_trials` table (`lib/db/src/schema/trials.ts`)
- `userId` (PK, text) — Clerk user ID
- `trialStartedAt` (timestamp) — set on first `getOrCreateTrial`
- `diagnosticCredits` (integer, default 25) — decremented by `consumeTrialCredit`
- `rewardsEarned` (text[]) — list of reward IDs already awarded (idempotency)
- `createdAt`, `updatedAt`

## Backend: `artifacts/api-server/src/routes/usage.ts`
- `POST /api/usage/gate` — returns `{ allowed, status, trialActive, trialDaysLeft, trialCreditsLeft, rewardsEarned }`
- `GET /api/usage/status` — same fields on status check
- `POST /api/usage/reward` — body `{ clientId, rewardId }`, returns `{ bonusCredits, totalCredits, alreadyEarned }`

## Backend: `artifacts/api-server/src/storage.ts`
- `getOrCreateTrial(userId)` — upserts the trial row, returns current state
- `consumeTrialCredit(userId)` — decrements `diagnosticCredits` by 1 (floor 0)
- `awardReward(userId, rewardId)` — adds credits, appends to `rewardsEarned` array (idempotent)
- `isValidRewardId(id)` — validates against the allowed reward ID list

## Reward IDs (5 credits each, once per account)
- `account_created` — first login / account creation (fired in App.tsx post-login effect)
- `first_diagnosis` — first successful AI diagnosis (fired in App.tsx diagnose.onSuccess)
- `first_unit_saved` — first equipment record saved (fired in UnitFormPage.tsx performSave)
- `first_photo` — first photo uploaded (fired in PhotoAlbum.tsx handleAdded)
- `first_timeline_entry` — first timeline entry added (fired in TimelineAddModal.tsx handleSubmit)

## Frontend: `artifacts/unitdown-ai/src/lib/rewards.ts`
- `awardReward(clientId, rewardId)` — calls `POST /api/usage/reward`; returns null for non-user_ IDs or network errors

## Trial badge UI (`App.tsx` Home component)
- `trialState` state (`{ active, daysLeft, creditsLeft, rewardsEarned } | null`) parsed from status/gate responses
- Renders a blue pill badge: "Pro Trial · Nd left · N diagnoses" when `trialState.active`
- Renders "Trial ended · Upgrade to continue" when `trialState && !trialState.active`
- Falls back to old "Free uses remaining" display for unauthenticated sessions

## Key enforcement rule
`consumeTrialCredit` is called in `artifacts/api-server/src/routes/hvac.ts` at all 3 success exit paths (KB hit, AI hit, KB fallback) — only when `isAuthClient && !isPro`.

**Why:** Prevents double-charging on AI retry paths; server always has the authoritative credit count.
