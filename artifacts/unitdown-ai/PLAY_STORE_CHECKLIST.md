# UnitDown AI — Google Play Store Submission Checklist

## App Identity

| Field | Value |
|---|---|
| **App name** | UnitDown AI |
| **Package name** | com.unitdown.ai |
| **Default language** | English (US) |
| **App category** | Tools |

---

## Store Listing

### Short description (80 chars max)
```
Commercial HVAC diagnostics for technicians and facility teams.
```

### Full description (4000 chars max)
```
UnitDown AI is a professional HVAC diagnostic tool built for commercial technicians, facility managers, and building engineers.

Describe the fault — UnitDown analyzes symptoms against a 55-entry knowledge base covering rooftop units, gas heat, refrigerant systems, electrical faults, and more.

WHAT YOU GET PER DIAGNOSIS:
• Root cause with confidence score
• Why this fault fits your symptom pattern
• Likely causes ranked by frequency
• Step-by-step first checks
• Specific meter and gauge readings to take
• Priority level and risk if left unrepaired
• Up to 2 alternative diagnoses with full detail

FAULT CATEGORIES COVERED:
• Gas heat — ignition sequence, flame sensor, pressure switch, inducer, rollout
• Refrigerant — high/low superheat, subcooling, liquid slugging, leak detection
• Electrical — capacitors, contactors, heat strips, sequencers, VFDs
• Mechanical — blower, condenser fan, compressor bearings, reversing valve
• Controls — thermostat, economizer, VRF, BAS lockouts
• Environmental — afternoon capacity failures, freeze protection, flood/lightning damage
• Oil heat — lockout, puffback, sooting, pump failure

SMART CONTRADICTION DETECTION:
The engine automatically detects conflicting symptoms and adjusts:
• "Burners lit then went out" → routes away from ignition toward flame sensor
• "Blower started immediately on heat call" → routes to immediate-blower fault, not inducer
• Prevents misdiagnosis from symptom overlap

MEMBERSHIP PLANS:
• Free trial: 3 diagnoses to try the tool
• Pro ($19/mo): unlimited diagnoses, full knowledge library
• Team ($59/mo): Pro features + team management

UnitDown AI is designed for commercial HVAC — rooftop units, chillers, split systems, mini-splits, PTACs, and more.
```

---

## App Screenshots Required

Take screenshots at **1080 × 1920 px** (portrait phone):

1. **Home / symptom input** — show the input field and "Analyze" button
2. **Diagnosis result — primary card** — show fault name, confidence bar, priority badge
3. **First checks + meter readings** — scroll to show the step-by-step cards
4. **Alternatives accordion** — expanded alternative diagnoses
5. **Knowledge library / guides hub** — the `/guides` page
6. **Pro upgrade modal** — the paywall / membership screen

Tablet screenshots (1200 × 1920 px) are optional but improve store visibility.

---

## Required Assets

| Asset | Size | Notes |
|---|---|---|
| App icon | 512 × 512 px PNG | No alpha. Use `icon-512.png` as source. |
| Feature graphic | 1024 × 500 px | Blue (#2563eb) background with logo + tagline |
| Phone screenshots | 1080 × 1920 px | Min 2, max 8 |

---

## Content Rating

Run the **IARC questionnaire** in Play Console:

- Violence: None
- Sexual content: None
- Profanity: None
- Gambling: No
- User-generated content: No (diagnoses are AI-generated, not user-posted)
- Data sharing: Yes (email for Pro sign-up, Stripe payment)

Expected rating: **Everyone**

---

## Privacy Policy

URL: `https://unitdown.org/privacy`

The app collects:
- Email address (for Pro/Team sign-up via Clerk)
- Payment info (via Stripe — not stored on our servers)
- Usage data (anonymous, for diagnostic quality improvement)

---

## Data Safety (Play Console)

| Data type | Collected? | Purpose |
|---|---|---|
| Email address | Yes | Account creation |
| Name | Optional | Account profile |
| Payment info | Yes (Stripe) | Purchases |
| Crash logs | No | — |
| Device identifiers | No | — |

Encryption in transit: Yes (HTTPS only)  
Users can request deletion: Yes (email support@unitdown.org)

---

## Signing Keystore Setup (One-time)

**Generate a release keystore on your local machine:**

```bash
keytool -genkey -v \
  -keystore unitdown-release.keystore \
  -alias unitdown \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Required information:**
- First and last name: UnitDown AI
- Organizational unit: Engineering
- Organization: UnitDown AI
- City: [your city]
- State: [your state]
- Country code: US

**Store safely:**
- Keep `unitdown-release.keystore` somewhere PERMANENT (losing it means you cannot update the app on Play)
- Never commit the keystore file to git

**Encode for GitHub Actions:**
```bash
base64 -i unitdown-release.keystore | pbcopy
# Paste as GitHub secret: ANDROID_KEYSTORE_BASE64
```

**GitHub Secrets to set:**
| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | Password you chose during keytool |
| `ANDROID_KEY_ALIAS` | `unitdown` |
| `ANDROID_KEY_PASSWORD` | Same as keystore password (or separate if you set one) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key |

---

## Building the AAB

1. Push this repo to GitHub
2. Go to **Actions** → **Build Android AAB** → **Run workflow**
3. Enter version name (e.g. `1.0.0`) and version code (e.g. `1`)
4. Download `app-release.aab` from the workflow artifacts

---

## Test Account for Play Review

If Google needs to test the Pro-gated content:
- Create a test account at unitdown.org
- Manually set Pro status in the admin view (`/admin`)
- Share credentials in the Play Console notes field

---

## App Review Notes (for Play Console)

```
UnitDown AI is a web-based HVAC diagnostic tool wrapped in a Capacitor WebView
pointing to https://unitdown.org. No special permissions are required.

The app does not use camera, microphone, location, or contacts.

The Pro subscription ($19/mo) and Team subscription ($59/mo) use Stripe for
payment processing — these are web-based purchases via the site, not in-app
purchases. Per Play policy, digital goods/subscriptions sold through the web
and not unlocked exclusively within the Android app are exempt from the Play
billing requirement.

Test credentials available upon request.
```

---

## Post-Launch Tasks

- [ ] Set up Google Play App Signing (enroll in Play App Signing for key safety)
- [ ] Add Firebase Crashlytics for error tracking
- [ ] Submit for review (expect 3–7 days first submission)
- [ ] Reply to first reviews within 48 hours
- [ ] Set up staged rollout (10% → 50% → 100%) for future updates
