import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.median.ios.abmwydj",
  appName: "UnitDown AI",
  webDir: "dist/public",
  server: {
    // The app loads the production site in a full-screen WebView.
    // All auth and navigation stay within the unitdown.org origin.
    url: "https://unitdown.org",
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
    // Keyboard behavior: push content up so inputs stay visible.
    scrollEnabled: true,
    // Prevent bounce when scrolling past content edges.
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
    Browser: {
      // @capacitor/browser handles links that open outside the WebView origin.
      // Google OAuth opens via the system browser.
    },
  },
};

export default config;
