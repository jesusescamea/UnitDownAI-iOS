# UnitDown AI — iOS Setup Guide (clean Mac)

Follow these steps on a fresh Mac to go from a clean `git clone` all the way
to an Xcode archive ready for App Store Connect.

---

## 1 · Prerequisites

Install these once — skip anything you already have.

```bash
# Xcode — install from the Mac App Store (≥ 15.0 required)

# Xcode command-line tools
xcode-select --install

# Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js 24
brew install node@24
echo 'export PATH="/opt/homebrew/opt/node@24/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# pnpm
npm install -g pnpm

# Git (bundled with Xcode CLT, or via brew)
brew install git   # optional — already available after xcode-select --install
```

---

## 2 · Clone the repository

```bash
git clone https://github.com/jesusescamea/UnitDownAI-iOS.git
cd UnitDownAI-iOS
```

---

## 3 · Environment variables

```bash
cp artifacts/unitdown-ai/.env.example artifacts/unitdown-ai/.env
```

Edit `.env` and set `VITE_CLERK_PUBLISHABLE_KEY` to your Clerk **production**
publishable key (`pk_live_…`).  You can find it in the
[Clerk dashboard → API Keys](https://dashboard.clerk.com).

---

## 4 · Install dependencies

```bash
pnpm install
```

This installs all workspace packages from the lockfile — no internet access
needed for the iOS vendor packages (they live in `ios/App/vendor/`).

---

## 5 · Build web assets

```bash
pnpm --filter @workspace/unitdown-ai run build
```

This compiles the React app into `artifacts/unitdown-ai/dist/public/`.

---

## 6 · Sync to iOS  *(always use this script — not raw `npx cap sync`)*

```bash
pnpm --filter @workspace/unitdown-ai run sync:ios
```

This runs `npx cap sync ios` and **immediately** restores the correct
`CapApp-SPM/Package.swift` vendor paths.  Running raw `npx cap sync ios`
directly will overwrite `Package.swift` with broken pnpm store paths and
break the Xcode build — always use `sync:ios` instead.

---

## 7 · Open in Xcode and archive

1. Open Xcode.
2. **File → Open** → navigate to `artifacts/unitdown-ai/ios/App/` → select
   `App.xcodeproj`.
3. In the scheme selector (top-left), choose **App** and **Any iOS Device
   (arm64)**.
4. **Product → Archive**.
5. When the Organizer appears, click **Distribute App → App Store Connect →
   Upload**.

---

## Notes

- **Bundle ID**: `co.median.ios.abmwydj` — matches App Store Connect.
- **Build number**: set in `App.xcodeproj/project.pbxproj`
  (`CURRENT_PROJECT_VERSION`).  Increment it for each new upload.
- **In-App Purchase product ID**: `com.unitdown.subscription.monthly` — attach
  it to the build in App Store Connect before submitting for review.
- **App icon**: if Apple rejects with guideline 2.3.8, replace
  `App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` with a
  non-transparent 1024 × 1024 PNG.
