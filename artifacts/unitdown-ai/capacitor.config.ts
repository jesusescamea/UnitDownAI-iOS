import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "co.median.ios.abmwydj",
  appName: "UnitDown AI",
  webDir: "dist/public",
  server: {
    // server.url is intentionally NOT set for iOS so the archive bundles the
    // current JS assets from dist/public (copied by `npx cap sync`).  Bundled
    // assets guarantee that the exact code at archive time runs on-device —
    // no runtime dependency on the live production site, no stale-code issues.
    //
    // Android-only note: if you need the Android build to load from a remote
    // URL, add `url` back conditionally or via a separate capacitor config.
    cleartext: false,
    androidScheme: "https",
    iosScheme: "https",
    allowNavigation: [
      "*.unitdown.org",
      "*.clerk.com",
      "*.clerk.dev",
    ],
  },
  android: {
    backgroundColor: "#1e3a5f",
  },
  ios: {
    backgroundColor: "#1e3a5f",
    scrollEnabled: true,
    contentInset: "safe",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#1e3a5f",
      androidScaleType: "CENTER_CROP",
      iosSpinnerStyle: "small",
      spinnerColor: "#ffffff",
      showSpinner: false,
    },
    Browser: {},
  },
};

export default config;
