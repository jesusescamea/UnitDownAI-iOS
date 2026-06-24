/**
 * appReview.ts
 *
 * App Store review request logic for the iOS Capacitor build.
 *
 * Uses a custom Capacitor plugin (UnitDownReviewPlugin.swift) to call
 * SKStoreReviewController.requestReview() — Apple's native review dialog.
 * No custom rating UI is shown; only the OS-level prompt.
 *
 * Eligibility (all required):
 *   - diagnosesCompleted >= 3
 *   - thumbsUpGiven >= 3
 *   - daysUsed.length >= 2  (distinct calendar days the app was opened)
 *
 * Rate limits (local, enforced on top of Apple's own system limits):
 *   - reviewShownCount < 3 lifetime
 *   - lastReviewShownAt is null OR > 120 days ago
 *
 * Optional positive signals (tracked but not required for eligibility):
 *   - savedUnitCount, timelineEntryCount, photoCount
 *
 * All counters are persisted in localStorage under "unitdown_review_state".
 * The iOS native side is never called on web or Android.
 *
 * Do NOT call from:
 *   - First app launch / signup / login flows
 *   - Scanner completion
 *   - Subscription purchase or paywall interactions
 */

import { registerPlugin } from "@capacitor/core";
import { isIOSApp } from "./platform";

// ── Plugin interface ──────────────────────────────────────────────────────────

interface UnitDownReviewPlugin {
  requestReview(): Promise<{ requested: boolean }>;
}

// Web stub: silently no-ops so web builds compile without errors.
// The isIOSApp() guard in maybeRequestReview() ensures it is never called
// on web in practice.
const UnitDownReview = registerPlugin<UnitDownReviewPlugin>("UnitDownReview", {
  web: () => ({
    requestReview: async () => ({ requested: false }),
  }),
});

// ── Persistence ───────────────────────────────────────────────────────────────

const STORAGE_KEY  = "unitdown_review_state";
const MAX_PROMPTS  = 3;
const COOLDOWN_DAYS = 120;

interface ReviewState {
  diagnosesCompleted: number;
  thumbsUpGiven: number;
  daysUsed: string[];          // unique "YYYY-MM-DD" strings (local time)
  savedUnitCount: number;
  timelineEntryCount: number;
  photoCount: number;
  reviewShownCount: number;
  lastReviewShownAt: string | null;   // ISO timestamp string
}

const DEFAULTS: ReviewState = {
  diagnosesCompleted: 0,
  thumbsUpGiven: 0,
  daysUsed: [],
  savedUnitCount: 0,
  timelineEntryCount: 0,
  photoCount: 0,
  reviewShownCount: 0,
  lastReviewShownAt: null,
};

function loadState(): ReviewState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveState(s: ReviewState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Adds today to daysUsed (idempotent — won't add duplicates). */
function withToday(s: ReviewState): ReviewState {
  const today = todayIso();
  if (s.daysUsed.includes(today)) return s;
  return { ...s, daysUsed: [...s.daysUsed, today] };
}

// ── Tracking helpers ──────────────────────────────────────────────────────────
// Call these at the matching product events. They are always safe to call on
// web — the iOS guard lives inside maybeRequestReview().

export function trackDiagnosisComplete(): void {
  const s = withToday(loadState());
  saveState({ ...s, diagnosesCompleted: s.diagnosesCompleted + 1 });
}

export function trackThumbsUp(): void {
  const s = loadState();
  saveState({ ...s, thumbsUpGiven: s.thumbsUpGiven + 1 });
}

export function trackUnitSaved(): void {
  const s = loadState();
  saveState({ ...s, savedUnitCount: s.savedUnitCount + 1 });
}

export function trackTimelineEntry(): void {
  const s = loadState();
  saveState({ ...s, timelineEntryCount: s.timelineEntryCount + 1 });
}

export function trackPhoto(): void {
  const s = loadState();
  saveState({ ...s, photoCount: s.photoCount + 1 });
}

// ── Eligibility ────────────────────────────────────────────────────────────────

function isEligible(s: ReviewState): boolean {
  // Required conditions
  if (s.diagnosesCompleted < 3) return false;
  if (s.thumbsUpGiven < 3) return false;
  if (s.daysUsed.length < 2) return false;

  // Lifetime cap
  if (s.reviewShownCount >= MAX_PROMPTS) return false;

  // Cooldown window
  if (s.lastReviewShownAt) {
    const msSince = Date.now() - new Date(s.lastReviewShownAt).getTime();
    const daysSince = msSince / (1000 * 60 * 60 * 24);
    if (daysSince < COOLDOWN_DAYS) return false;
  }

  return true;
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Call this from any eligible trigger location (diagnosis complete, thumbs-up,
 * unit saved, home mount). The function checks eligibility and rate limits
 * before calling the native plugin and always resolves — never throws.
 *
 * Safe to call on web; no-ops silently when not on iOS Capacitor.
 *
 * @param trigger  Short label for logging (e.g. "diagnosis", "thumbs_up")
 */
export async function maybeRequestReview(trigger: string): Promise<void> {
  // iOS native only — Apple's API is not available on web or Android
  if (!isIOSApp()) return;

  // Record today then re-check eligibility with the updated daysUsed list
  let s = withToday(loadState());
  saveState(s);

  if (!isEligible(s)) {
    console.log(
      `[AppReview] skip trigger=${trigger}` +
      ` diag=${s.diagnosesCompleted} thumbs=${s.thumbsUpGiven}` +
      ` days=${s.daysUsed.length} shown=${s.reviewShownCount}` +
      ` lastShown=${s.lastReviewShownAt ?? "never"}`
    );
    return;
  }

  console.log(`[AppReview] requesting review trigger=${trigger}`);
  try {
    const { requested } = await UnitDownReview.requestReview();
    if (requested) {
      const updated: ReviewState = {
        ...s,
        reviewShownCount: s.reviewShownCount + 1,
        lastReviewShownAt: new Date().toISOString(),
      };
      saveState(updated);
      console.log(
        `[AppReview] review dialog shown — total shown: ${updated.reviewShownCount}/${MAX_PROMPTS}`
      );
    } else {
      console.log("[AppReview] review not shown (no active scene)");
    }
  } catch (err) {
    // Never let a review error surface to the user
    console.log("[AppReview] requestReview threw:", err);
  }
}
