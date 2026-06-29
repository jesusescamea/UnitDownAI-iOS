---
name: PT Chart + Navigation Architecture
description: AppNavSection type changes, PT Chart page location, and Diagnose page authenticated-user redesign approach.
---

## AppNav Section Type
`AppNavSection` is now `"dashboard" | "job" | "pt-chart" | "records" | "account"`.
- "diagnose" was removed from the type entirely.
- The Diagnose page (`Home` component) passes no `active` prop to AppNav (`<AppNav />`) so no tab is highlighted when the user navigates there from a quick action.
- The PT Chart page passes `active="pt-chart"`.

**Why:** Diagnose was removed from top nav so the PT Chart tool gets a permanent top-nav slot. Diagnosis is still accessible from `/diagnose` URL (e.g. dashboard quick actions), just not a tab.

## Diagnose Page (Home component) Authenticated UX
The `Home` export from `App.tsx` conditionally renders based on `clerkLoaded && clerkUser`:
- Marketing h1 + tagline: `{!(clerkLoaded && clerkUser) && <marketing content>}`
- "Web CTA" (Use on the Web button): same guard
- Trust Badges section: same guard
- Authenticated-user header: `{clerkLoaded && clerkUser && <Run Diagnosis title>}`

**Why:** Avoids a full component split — the diagnosis logic (Pro check, usage gating, runDiagnosis) is unchanged. Only the marketing framing is hidden for users who are already in the app.

## PT Chart Page
Located at `artifacts/unitdown-ai/src/pages/PTChartPage.tsx`.
- Route: `/pt-chart` added to App.tsx Switch block
- Imports from `refrigerantData.ts`: `getSaturationTemp`, `interpretSuperheat`, `interpretSubcooling`, `interpretCharge`, `REFRIGERANT_INFO`, `ALL_REFRIGERANTS`
- All calculations are client-side (no API calls) — fully offline capable
- `interpretCharge` function added to `refrigerantData.ts` — takes SH + SC + ref + meteringDevice, returns `ChargeInterpretation` with state/label/description/urgency/color

## Refrigerant Data
`SupportedRefrigerant` now includes: R-410A, R-22, R-454B, R-32, R-407C, R-134a, R-404A, R-448A, R-449A, R-1234yf.
- R410A_FIELD_TABLE (field-calibrated, 40°F=120 PSIG) is still used for R-410A (not the ASHRAE standard table)
- New refrigerant data is ASHRAE-calibrated (not field-adjusted)
- `detectRefrigerant` updated to recognize new refrigerant strings including trade names (N40, XP40, 1234YF)
