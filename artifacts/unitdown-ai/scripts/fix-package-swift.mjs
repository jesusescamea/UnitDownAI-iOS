/**
 * Restores the correct CapApp-SPM/Package.swift after every `npx cap sync`.
 *
 * WHY THIS EXISTS
 * ---------------
 * `npx cap sync ios` re-generates Package.swift using the paths it finds in
 * node_modules.  In a pnpm workspace those paths contain ".pnpm" store
 * segments (e.g. "node_modules/.pnpm/@capacitor+browser@8.0.3/…") that do
 * NOT exist as physical directories on the file system.  Xcode therefore
 * cannot resolve the SPM dependencies and the build fails.
 *
 * The fix: we vendor the two Capacitor plugins under ios/App/vendor/ and
 * reference them with relative local paths.  This script overwrites the
 * auto-generated Package.swift with that correct content immediately after
 * every sync so the repo always stays buildable.
 *
 * USAGE
 * -----
 * Run via the `sync:ios` npm script:
 *   pnpm --filter @workspace/unitdown-ai run sync:ios
 *
 * Or directly:
 *   node artifacts/unitdown-ai/scripts/fix-package-swift.mjs
 */

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PACKAGE_SWIFT_PATH = join(
  __dirname,
  "../ios/App/CapApp-SPM/Package.swift"
);

const CORRECT_CONTENT = `\
// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.3.4"),
        .package(name: "CapacitorBrowser", path: "../vendor/capacitor-browser"),
        .package(name: "CapacitorSplashScreen", path: "../vendor/capacitor-splash-screen")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorBrowser", package: "CapacitorBrowser"),
                .product(name: "CapacitorSplashScreen", package: "CapacitorSplashScreen")
            ]
        )
    ]
)
`;

writeFileSync(PACKAGE_SWIFT_PATH, CORRECT_CONTENT, "utf8");
console.log("✅  Package.swift vendor paths restored.");
