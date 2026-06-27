# UnitDown AI

A web application that provides self-guided HVAC troubleshooting and diagnostic assistance for technicians, facility teams, and business owners.

---

## UnitDown Service Standard (USS) — North Star Vision

> "Does this improve the quality, trustworthiness, portability, or long-term value of the UnitDown Service Record? If yes, it belongs. If not, reconsider."

The long-term objective is not just an HVAC app. It is the **industry's most trusted digital service record** — the UnitDown Service Standard (USS).

### The problem UnitDown solves at scale
Every contractor, OEM, CMMS, and technician documents service differently. Equipment history is fragmented. When service companies change, critical history is lost. UnitDown fixes this by making the equipment — not the service company — the owner of its own history.

### The USS goal
When a facility changes service providers, the conversation should be:
> "Do you have the UnitDown Service History?"
> "Yes."
> (New contractor imports it. Immediately knows everything.)

### Every completed job produces a UnitDown Service Record (USR)
Each record carries a permanent identifier (e.g. `USR-2030-004921`). Future: QR codes attached to equipment surface the full history on scan.

A complete USR includes:
- Unique Service Record ID
- Company + technician + date/time
- Customer + equipment
- Full chronological timeline
- Photos (categorized: nameplate, alarm, measurement, failed part, repair, verification)
- Every measurement ever recorded (voltage, amperage, superheat, subcooling, refrigerant, static pressure, etc.)
- Voice transcript + AI-corrected transcript
- AI Professional Report (readable by technicians, OEM, facility managers, future contractors)
- Customer summary (plain English, no jargon)
- Invoice summary
- Parts replaced
- Recommendations
- Equipment Memory updates
- Verification + completion status
- AI Confidence / Office Ready / Completeness score

### Ownership principle
- The **equipment owner** owns the history, not the service company.
- Service companies contribute records.
- The building owner controls whether records can be shared with future contractors.
- UnitDown is vendor-neutral by design.

### Portability
Equipment history must remain portable. Future contractors import previous UnitDown history with customer authorization. History is never locked inside a single company or CMMS.

### Architecture alignment (current state)
The existing Job Mode system is already the USS foundation:
- `job_timeline_events` table = chronological, typed, portable record per service call
- `event.metadata` jsonb = open hook for AI enrichment, smart photos, equipment memory updates
- Client-generated permanent IDs = records exist before they hit the cloud
- Offline-first sync queue = records are never lost even without connectivity
- `event.measurements` jsonb = future searchable measurement history
- `event.parts` jsonb = parts history hook

### Future stakeholders
Commercial contractors · Facility managers · Property owners · OEM technical support · Equipment manufacturers · Warranty administrators · Insurance providers · Building engineers · Energy consultants · Future service companies

## Run & Operate

- `pnpm run typecheck`: Performs a full typecheck across all packages.
- `pnpm run build`: Typechecks and builds all packages.
- `pnpm --filter @workspace/api-spec run codegen`: Regenerates API hooks and Zod schemas from the OpenAPI specification.
- `pnpm --filter @workspace/db run push`: Pushes database schema changes (development only).
- `pnpm --filter @workspace/api-server run dev`: Runs the API server locally.

**Environment Variables**:
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `FREE_DIAGNOSES` (default: 4)

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24
- **TypeScript**: 5.9
- **API Framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API Codegen**: Orval (from OpenAPI spec)
- **Build Tool**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (gpt-5.4)
- **Authentication**: Clerk
- **Payments**: Stripe

## Where things live

- `artifacts/unitdown-ai`: React + Vite frontend application.
- `artifacts/api-server`: Express 5 backend API server.
- `lib/db/src/schema/users.ts`: Database schema for users.
- `artifacts/api-server/src/data/hvacKnowledgeBase.ts`: HVAC knowledge base entries.
- `artifacts/unitdown-ai/vite.config.ts`: Vite PWA configuration.
- `artifacts/unitdown-ai/capacitor.config.ts`: Capacitor configuration.
- `.github/workflows/android-build.yml`: GitHub Actions workflow for Android AAB build.
- `artifacts/unitdown-ai/PLAY_STORE_CHECKLIST.md`: Android Play Store submission checklist.
- `lib/api-zod/src/index.ts`: Manually maintained API Zod schemas.

## Architecture decisions

- **Stripe Integration**: Storage layer directly queries Stripe API for subscription status, avoiding direct DB dependency for real-time checks.
- **Pro vs Free Tier Enforcement**: Backend-enforced at the API level by checking the `users` table for `isPro` status, with efficient DB-only queries.
- **PWA Service Worker Strategy**: `NetworkOnly` for `/api/*` to prevent caching stale diagnosis results, `StaleWhileRevalidate` for Google Fonts CSS, `CacheFirst` for Google Fonts files, and precaching for built assets.
- **Capacitor Remote URL**: The Android app uses a remote URL (`https://unitdown.org`) for its WebView (MVP approach).
- **Smart Free-Use Protection**: Server-side usage tracking using session cookies, device fingerprinting, and IP soft-matching to prevent bypasses of the free diagnosis limit.

## Product

- Self-guided HVAC diagnostic web application.
- Premium membership model with free tier limitations and Pro upgrade options.
- HVAC symptom input leading to ranked diagnosis, step-by-step checks, and meter readings.
- Multi-result diagnosis including primary and alternative diagnoses.
- Comprehensive HVAC knowledge base with contradiction detection in the scoring engine.
- SEO-optimized landing pages for general troubleshooting guides and brand/model-specific guides, gated behind a Pro/Team membership.
- Mobile-responsive design with PWA capabilities.
- Android application build via Capacitor (AAB via CI).

## User preferences

_Populate as you build_

## Gotchas

- After running `pnpm --filter @workspace/api-spec run codegen`, `lib/api-zod/src/index.ts` needs to be manually updated if new schemas are added to avoid export conflicts.
- Android AAB builds require GitHub Actions or local Android Studio; Java is not available in Replit for this purpose.

## Pointers

- [pnpm-workspace skill](https://www.replit.com/talk/ask/pnpm-workspace-skill/12345) (example link)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs)
- [Zod Documentation](https://zod.dev/)
- [Orval Documentation](https://orval.dev/)
- [Clerk Documentation](https://clerk.com/docs)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Capacitor Documentation](https://capacitorjs.com/docs)