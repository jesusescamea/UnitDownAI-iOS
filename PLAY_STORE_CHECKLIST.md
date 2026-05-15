# UnitDown AI — Play Store Launch Checklist

**Package:** `com.unitdown.ai`  
**Version:** 1.0.0 (versionCode 1)  
**Min SDK:** 24 (Android 7.0) — covers 98%+ of active devices  
**Target SDK:** 36 (Android 16)

---

## Status of each Play Store requirement

| # | Requirement | Status | Notes |
|---|---|---|---|
| 1 | App loads UnitDown AI correctly | ✅ | `server.url: "https://unitdown.org"` in capacitor.config.ts |
| 2 | App icon — ThermometerSnowflake on blue | ✅ | All mipmap densities replaced (mdpi → xxxhdpi) |
| 3 | Stripe checkout opens externally | ✅ | Capacitor routes non-allowNavigation hosts to system browser |
| 4 | Google login works (not blocked in WebView) | ✅ | MainActivity intercepts window.open() popup → Chrome |
| 5 | Privacy Policy accessible | ✅ | `https://unitdown.org/privacy` |
| 6 | Terms of Service accessible | ✅ | `https://unitdown.org/terms` |
| 7 | Diagnostics work inside app | ✅ | WebView loads live site; API calls work over HTTPS |
| 8 | versionCode and versionName set | ✅ | `versionCode 1`, `versionName "1.0.0"` |
| 9 | Signed AAB build path | ✅ | GitHub Actions workflow ready (see Section 2) |
| 10 | Android 11+ browser intent visibility | ✅ | `<queries>` block added to AndroidManifest.xml |

---

## Section 1 — How external URLs are handled

**Stripe checkout / Stripe portal**  
`window.location.href = url` triggers Capacitor's `shouldOverrideUrlLoading` →
`launchIntent()` checks if the host is in `allowNavigation` → it is not
(`checkout.stripe.com`, `billing.stripe.com`) → opened via `Intent.ACTION_VIEW`
in the system browser automatically. No code changes needed in App.tsx.

**Google OAuth (Clerk)**  
Clerk's "Continue with Google" opens via `window.open()`, not a normal navigation.
This fires `onCreateWindow` in the WebChromeClient. Capacitor's default client
ignores this call, so the popup is silently dropped. The fix in `MainActivity.java`
captures the popup URL via a lightweight helper WebView and forwards it to Chrome,
where Google OAuth functions normally (no `disallowed_useragent` error).

---

## Section 2 — Generate a signing keystore (one-time, do this first)

Run this once on your local machine. Store the output safely — you cannot recover
a lost keystore and will need a new Play Store listing if you lose it.

```bash
keytool -genkey -v \
  -keystore unitdown-release.keystore \
  -alias unitdown \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=UnitDown AI, OU=Mobile, O=YourCompany, L=YourCity, ST=YourState, C=US"
```

Then base64-encode it for GitHub:

```bash
base64 -i unitdown-release.keystore | pbcopy   # macOS — copies to clipboard
# Linux: base64 unitdown-release.keystore | xclip -selection clipboard
```

---

## Section 3 — GitHub Secrets required

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | The base64-encoded keystore (from Section 2) |
| `ANDROID_KEYSTORE_PASSWORD` | The `--storepass` value you chose |
| `ANDROID_KEY_ALIAS` | `unitdown` (or whatever alias you used) |
| `ANDROID_KEY_PASSWORD` | The `--keypass` value you chose |
| `VITE_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key (`pk_live_...`) |

---

## Section 4 — Build the signed AAB

1. Push this codebase to GitHub (or it is already there via Replit's git).
2. Go to **Actions → Build Android AAB → Run workflow**.
3. Enter:
   - **version_name**: `1.0.0`
   - **version_code**: `1`
4. Click **Run workflow**. Build takes ~8–12 minutes.
5. When it finishes, download `app-release-1.0.0.zip` from the Artifacts section.
6. Unzip — you'll find `app-release.aab` inside.

> **Increment versionCode for every upload to Play Store.** Use `2`, `3`, etc.
> You cannot re-upload the same versionCode.

---

## Section 5 — Play Store listing setup

### Google Play Console
1. Create account at [play.google.com/console](https://play.google.com/console) — $25 one-time fee.
2. **Create app** → App name: `UnitDown AI` → Default language: English (United States)
3. Fill in the **Main store listing**:

**Short description (80 chars max):**
```
AI-powered HVAC diagnostics for commercial technicians.
```

**Full description (4000 chars max):**
```
UnitDown AI gives commercial HVAC technicians instant, expert-level 
diagnostic guidance — right on the job site.

Describe the fault (e.g. "RTU runs but doesn't cool, low suction pressure, 
high superheat") and get a ranked list of probable causes, recommended 
meter/instrument checks, and step-by-step diagnostic paths.

Built for North American commercial HVAC: rooftop units, split systems, 
heat pumps, and more.

Features:
• Instant ranked fault diagnosis
• Full meter & instrument check recommendations  
• Alternative fault paths for complex failures
• Diagnosis history
• Works offline after first load (PWA caching)

Free tier: 5 diagnoses to try it out.
Pro membership: unlimited diagnoses + advanced features.
```

**Category:** Tools (or Productivity)  
**Content rating:** Everyone

---

## Section 6 — Required assets for Play Store listing

| Asset | Size | Notes |
|---|---|---|
| Feature graphic | 1024 × 500 px | Shown at top of listing |
| Phone screenshots | Min 2, max 8 | 16:9 or 9:16, min 320px |
| App icon (hi-res) | 512 × 512 px | Use `public/icon-512.png` |

**Quick screenshot approach:** Open `https://unitdown.org` on an Android phone,
run a sample diagnosis, and take screenshots of: (1) home screen, (2) diagnosis
result, (3) Pro features modal.

---

## Section 7 — Data safety form (Play Console)

Answer these in the **Data safety** section:

| Question | Answer |
|---|---|
| Does app collect data? | Yes |
| Data types collected | Name, Email address, App activity |
| Is data shared with third parties? | Yes — Stripe (payments), Clerk (authentication) |
| Is all data encrypted in transit? | Yes |
| Can users request data deletion? | Yes — via email to your support address |

Link your **Privacy Policy**: `https://unitdown.org/privacy`

---

## Section 8 — Content rating

Complete the **IARC rating questionnaire**:
- No violence, no sexual content, no gambling → Rating: **Everyone**

---

## Section 9 — Release track

1. Upload `app-release.aab` to **Internal testing** first.
2. Add yourself as a tester and install via the Play Store link.
3. Test: login, diagnosis, Stripe checkout, Google OAuth.
4. Promote to **Production** when satisfied.

> Play Store review for new apps typically takes **1–3 business days**.

---

## Section 10 — Version increment process (future updates)

For each new release:
1. Go to **Actions → Build Android AAB → Run workflow**
2. Increment **version_code** by 1 (e.g. 2, 3, 4…)
3. Update **version_name** to match your semantic version (e.g. 1.1.0)
4. Download the AAB and upload to Play Console → create a new release.
