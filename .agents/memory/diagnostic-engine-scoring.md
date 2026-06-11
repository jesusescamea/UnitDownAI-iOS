---
name: Diagnostic engine scoring lessons
description: Non-obvious pitfalls in hvac-diagnostics.ts scoring that caused wrong KB primaries during validation.
---

## Rule
Before adding a short phrase to a detection array, verify it cannot match as a substring of its opposite. Also keep trigger lists on general entries specific — avoid broad terms that match nearly all inputs in that category.

**Why:** "flame lights" in FLAME_PROVEN_TERMS matched inside "no flame lights" (word-boundary regex `\bflame lights\b` succeeds there), applying a -50 penalty to `gas-heat-ignitor-glows-no-flame` and a +36 boost to `gas-heat-flame-dropout` whenever an ignition case described "no flame lights". This hid the correct specific entry behind wrong alternatives. Similarly, "no heat" and "no flame" as triggers on `gas-ignition-failure` gave that general entry 2 free trigger hits (+24 pts) on almost every gas-heat case, beating specific sub-entries that only matched one trigger.

**How to apply:**
- After adding a phrase to any detection array, grep the test corpus for inputs where the phrase could match in a negated or inverse context.
- Triggers on general/triage entries (e.g. `gas-ignition-failure`) should be specific diagnostic clues, not symptom summaries ("no heat", "no flame"). Move those to `symptomClues` instead.
- When a specific sub-entry consistently loses to its parent general entry, check whether the parent has too many clue-or-trigger overlaps rather than adjusting scores globally.
