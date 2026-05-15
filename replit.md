# UnitDown AI

A web application that provides self-guided HVAC troubleshooting and diagnostic assistance for technicians, facility teams, and business owners.

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