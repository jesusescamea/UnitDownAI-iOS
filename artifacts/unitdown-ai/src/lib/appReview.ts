/**
 * appReview.ts
 *
 * App Store review request logic for the iOS Capacitor build.
 *
 * Uses a custom Capacitor plugin (UnitDownReviewPlugin.swift) to call
 * SKStoreReviewController.requestReview() — Apple's native review dialog.
 * No custom rating UI is shown; only the OS-level prompt.
 *
 * Eligibility (ALL required):
 *   - diagnosesCompleted >= 3
 *   - thumbsUpGiven >= 2
 *   - daysUsed.length >= 2  (distinct calendar days the app was opened)
 *   - reviewCompleted is not true
 *
 * Rate limits (our own, on top of Apple's system limits):
 *   - reviewShownCount < 3 lifetime
 *   - lastReviewShownAt is null OR > 24 hours ago
 *
 * Optional positive signals (tracked, not required):
 *   - savedUnitCount, timelineEntryCount, photoCount
 *
 * NEVER prompt during: signup, login, scanner, paywall, error, subscription flow.
 *
 * All counters are persisted in localStorage under "unitdown_review_state".
 * The native plugin is never called on web or Android.
 */

import { registerPlugin } from "@capacitor/core";
import { isIOSApp } from "./platform";

// ── Plugin interface ──────────────────────────────────────────────────────────

interface UnitDownReviewPlugin {
  requestReview(): Promise<{ requested: boolean }>;
}

const UnitDownReview = registerPlugin<UnitDownReviewPlugin>("UnitDownReview", {
  web: () => ({
    requestReview: async () => ({ requested: false }),
  }),
});

// ── Persistence ───────────────────────────────────────────────────────────────

const STORAGE_KEY   = "unitdown_review_state";
const MAX_PROMPTS   = 3;
const COOLDOWN_HOURS = 24;   // minimum hours between prompts

interface ReviewState {
  diagnosesCompleted: number;
  thumbsUpGiven: number;
  daysUsed: string[];          // unique "YYYY-MM-DD" strings (local time)
  savedUnitCount: number;
  timelineEntryCount: number;
  photoCount: number;
  reviewShownCount: number;
  lastReviewShownAt: string | null;   // ISO timestamp
  reviewCompleted: boolean;           // user tapped "I reviewed" — stop prompting
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
  reviewCompleted: false,
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

function withToday(s: ReviewState): ReviewState {
  const today = todayIso();
  if (s.daysUsed.includes(today)) return s;
  return { ...s, daysUsed: [...s.daysUsed, today] };
}

// ── Tracking helpers ──────────────────────────────────────────────────────────

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

/** Call when the app is opened on a new day to record the daysUsed signal. */
export function trackAppOpen(): void {
  const s = withToday(loadState());
  saveState(s);
}

/**
 * Call if the user explicitly indicates they completed the review.
 * Permanently prevents future prompts.
 */
export function markReviewCompleted(): void {
  const s = loadState();
  saveState({ ...s, reviewCompleted: true });
}

// ── Eligibility ────────────────────────────────────────────────────────────────

function isEligible(s: ReviewState): boolean {
  if (s.reviewCompleted) return false;
  if (s.diagnosesCompleted < 3) return false;
  if (s.thumbsUpGiven < 2) return false;
  if (s.daysUsed.length < 2) return false;
  if (s.reviewShownCount >= MAX_PROMPTS) return false;

  if (s.lastReviewShownAt) {
    const msSince = Date.now() - new Date(s.lastReviewShownAt).getTime();
    const hoursSince = msSince / (1000 * 60 * 60);
    if (hoursSince < COOLDOWN_HOURS) return false;
  }

  return true;
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Check eligibility and, if met, call SKStoreReviewController on iOS.
 * Always resolves — never throws. No-ops silently on web and Android.
 *
 * @param trigger  Short label for log output (e.g. "diagnosis", "thumbs_up")
 */
export async function maybeRequestReview(trigger: string): Promise<void> {
  if (!isIOSApp()) return;

  let s = withToday(loadState());
  saveState(s);

  if (!isEligible(s)) {
    console.log(
      `[AppReview] skip trigger=${trigger}` +
      ` diag=${s.diagnosesCompleted} thumbs=${s.thumbsUpGiven}` +
      ` days=${s.daysUsed.length} shown=${s.reviewShownCount}` +
      ` completed=${s.reviewCompleted}`
    );
    return;
  }

  console.log(`[AppReview] requesting review trigger=${trigger}`);
  try {
    const { requested } = await UnitDownReview.requestReview();
    if (requested) {
      saveState({
        ...s,
        reviewShownCount: s.reviewShownCount + 1,
        lastReviewShownAt: new Date().toISOString(),
      });
      console.log(`[AppReview] dialog shown — total ${s.reviewShownCount + 1}/${MAX_PROMPTS}`);
    } else {
      console.log("[AppReview] review not shown (no active scene)");
    }
  } catch (err) {
    console.log("[AppReview] requestReview threw:", err);
  }
}
