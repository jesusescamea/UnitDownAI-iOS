import UIKit
import Capacitor

/**
 * ViewController.swift
 *
 * Custom bridge view controller that explicitly registers local Capacitor
 * plugins that are not distributed as npm packages.
 *
 * Background:
 *   Capacitor 8 (CapacitorBridge.registerPlugins) discovers plugins by reading
 *   `packageClassList` from the bundled capacitor.config.json.  That list is
 *   populated by `npx cap sync` from installed npm packages only.  Local plugins
 *   (Swift files inside ios/App/App/) are never in packageClassList, so they
 *   must be registered here via bridge?.registerPluginInstance(_:).
 *
 *   capacitorDidLoad() is called immediately after CapacitorBridge is
 *   initialised and before the WKWebView loads its first URL — the correct
 *   window to register additional plugins.
 */
class ViewController: CAPBridgeViewController {

    override func capacitorDidLoad() {
        // Register the local StoreKit IAP plugin.
        bridge?.registerPluginInstance(UnitDownIAPPlugin())
        print("⚡️ [ViewController] UnitDownIAP plugin registered — jsName=\(UnitDownIAPPlugin().jsName)")

        // Register the App Store review request plugin.
        bridge?.registerPluginInstance(UnitDownReviewPlugin())
        print("⚡️ [ViewController] UnitDownReview plugin registered — jsName=\(UnitDownReviewPlugin().jsName)")
    }
}
