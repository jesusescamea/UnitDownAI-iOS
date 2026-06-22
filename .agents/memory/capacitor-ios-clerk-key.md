---
name: Capacitor iOS Clerk key root cause
description: Why the iOS bundle ends up with pk_test_ and how to fix it permanently
---

# Capacitor iOS Clerk key root cause

## The rule
Always build `dist/public` with `VITE_CLERK_PUBLISHABLE_KEY=pk_live_...` before running `npx cap sync ios`. The dev environment secret is `pk_test_`; passing the override explicitly in the build command is required.

**Why:** `capacitor.config.ts` uses `webDir: "dist/public"` with no `server.url` — iOS bundles whatever was last in `dist/public` when `npx cap sync` ran. Vite embeds `VITE_CLERK_PUBLISHABLE_KEY` at build time. The Replit dev environment secret is `pk_test_`; the production deployment secret is `pk_live_`. A build in the dev env without an explicit override bakes `pk_test_` into the native bundle.

**How to apply:** When doing any iOS Capacitor rebuild:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsudW5pdGRvd24ub3JnJA \
  pnpm --filter @workspace/unitdown-ai run build
npx cap sync ios
```
Then verify with:
```python
python3 -c "
import re, glob
for f in glob.glob('artifacts/unitdown-ai/ios/App/App/public/assets/*.js'):
    m = re.search(r'pk_test_[A-Za-z0-9+/=\$_-]+', open(f).read())
    if m: print('FAIL', f, m.group(0))
print('OK — no pk_test_ found')
"
```

**Permanent fix:** User must update the `VITE_CLERK_PUBLISHABLE_KEY` Replit secret (Secrets panel) from `pk_test_` to `pk_live_Y2xlcmsudW5pdGRvd24ub3JnJA`.

**pk_live_ key extraction:** The live key is embedded in the production JS bundle and can be recovered with:
```bash
curl -s https://unitdown.org/assets/<bundle>.js | python3 -c "
import sys, re; d = sys.stdin.read()
m = re.search(r'pk_live_[A-Za-z0-9+/=\$_-]+', d)
print(m.group(0) if m else 'NOT FOUND')
"
```

## Why pk_test_ breaks Clerk on Capacitor iOS
- `isNative()=true` forces `proxyUrl = "https://unitdown.org/api/__clerk"` regardless of key type
- `pk_test_` initialization requires a `/v1/dev_browser` handshake, which the production proxy rejects with 400
- Clerk SDK silently fails to initialize → `isLoaded` stays `false` forever
- All login buttons have `disabled={!isLoaded}` → permanently greyed out on fresh install
