import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

// PORT is only required for the dev/preview server, not for `vite build`.
// In CI (GitHub Actions) or any non-dev context, fall back to 3000.
const rawPort = process.env.PORT ?? "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// BASE_PATH is the URL prefix used by the Replit proxy in development.
// In production / CI the app is served from the root, so default to "/".
const basePath = process.env.BASE_PATH ?? "/";

// Replit's secret-injection layer can cache VITE_CLERK_PUBLISHABLE_KEY across
// workflow restarts, serving a stale pk_test_ value even after the secret is
// updated in the Secrets panel. CLERK_PUBLISHABLE_KEY propagates correctly.
// This define bridges the gap: if VITE_ is stale (not pk_live_), fall back to
// the correctly-propagated CLERK_PUBLISHABLE_KEY.
const clerkPublishableKey = (() => {
  const viteKey = process.env.VITE_CLERK_PUBLISHABLE_KEY ?? "";
  if (viteKey.startsWith("pk_live_")) return viteKey;
  const fallback = process.env.CLERK_PUBLISHABLE_KEY ?? "";
  if (fallback) return fallback;
  return viteKey;
})();

export default defineConfig({
  base: basePath,
  define: {
    "import.meta.env.VITE_CLERK_PUBLISHABLE_KEY": JSON.stringify(clerkPublishableKey),
  },
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        // Precache all build artifacts
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,webmanifest}"],
        // SPA: all navigation falls back to index.html
        navigateFallback: "index.html",
        // Never intercept API, auth, or favicon requests
        navigateFallbackDenylist: [/^\/api\//, /^\/favicon/],
        runtimeCaching: [
          {
            // Diagnostic API + auth: always hit the network, never cached
            urlPattern: /\/api\//,
            handler: "NetworkOnly",
          },
          {
            // Google Fonts stylesheet — revalidate weekly
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Google Fonts files — content-addressed, cache one year
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
      manifest: {
        name: "UnitDown AI",
        short_name: "UnitDown AI",
        description: "Commercial HVAC diagnostics for technicians",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        scope: "/",
        orientation: "portrait-primary",
        categories: ["business", "productivity", "utilities"],
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      devOptions: {
        // Keep SW disabled in dev to avoid cache poisoning during development
        enabled: false,
      },
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
