import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * SSR-only Vite config used exclusively by the prerender step (scripts/prerender.mjs).
 *
 * Differences from the main vite.config.ts:
 *  - Builds a server-side ESM bundle from src/entry-server.tsx
 *  - Aliases browser-only modules to lightweight SSR stubs so that
 *    react-dom/server can render the public pages without crashing
 *  - No PWA, no Replit dev plugins, no service worker
 */

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  plugins: [react()],
  build: {
    ssr: "src/entry-server.tsx",
    outDir: "dist/server",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        format: "esm",
        entryFileNames: "entry-server.js",
      },
    },
  },
  resolve: {
    alias: [
      {
        find: /^@\/lib\/appleIAP$/,
        replacement: path.resolve(__dirname, "src/ssr/appleIAP-mock.ts"),
      },
      {
        find: /^@\/lib\/platform$/,
        replacement: path.resolve(__dirname, "src/ssr/platform-mock.ts"),
      },
      {
        find: "wouter/memory-location",
        replacement: path.resolve(__dirname, "src/ssr/wouter-location.ts"),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "src"),
      },
      {
        find: "@clerk/clerk-react",
        replacement: path.resolve(__dirname, "src/ssr/clerk-mock.tsx"),
      },
      {
        find: "@capacitor/browser",
        replacement: path.resolve(__dirname, "src/ssr/capacitor-browser-mock.ts"),
      },
      {
        find: "@capacitor/core",
        replacement: path.resolve(__dirname, "src/ssr/capacitor-core-mock.ts"),
      },
    ],
    dedupe: ["react", "react-dom"],
  },
  ssr: {
    noExternal: true,
  },
});
