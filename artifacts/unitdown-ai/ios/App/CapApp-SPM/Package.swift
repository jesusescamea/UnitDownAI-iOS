// swift-tools-version: 5.9
import PackageDescription

// Capacitor plugin dependencies are vendored into ios/App/vendor/ so the
// Xcode project can be built without running pnpm install on the Mac.
// To update a plugin: re-run `cap sync` in Replit, then copy the updated
// Swift sources from node_modules into ios/App/vendor/ and commit.
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
