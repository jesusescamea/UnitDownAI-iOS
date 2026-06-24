/**
 * UnitDownReviewPlugin.swift
 *
 * Capacitor plugin that calls SKStoreReviewController to trigger Apple's
 * native App Store review prompt.
 *
 * Registration:
 *   Explicitly registered in ViewController.swift via
 *   bridge?.registerPluginInstance(UnitDownReviewPlugin())
 *   inside capacitorDidLoad().
 *
 * Apple's own rate-limiting applies on top of our in-app logic:
 *   - The dialog is shown at most ~3 times per 365-day period per Apple ID.
 *   - Apple may suppress it silently (already reviewed, quota reached, etc.).
 *   - We never build a custom 5-star UI gate — only the native system dialog.
 *
 * Xcode setup (outside Replit):
 *   1. Confirm UnitDownReviewPlugin.swift is added to the App target.
 *   2. No additional entitlements or capabilities required — StoreKit is
 *      available on all iOS targets ≥ 10.3.
 *   3. Run: npx cap sync
 */

import Capacitor
import StoreKit

@objc(UnitDownReviewPlugin)
public class UnitDownReviewPlugin: CAPPlugin, CAPBridgedPlugin {

    // MARK: - CAPBridgedPlugin

    public let identifier = "UnitDownReviewPlugin"
    public let jsName = "UnitDownReview"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestReview", returnType: "promise"),
    ]

    // MARK: - requestReview

    @objc func requestReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if #available(iOS 14.0, *) {
                // Prefer the scene-based API (required on iOS 14+, avoids deprecation warning)
                let activeScene = UIApplication.shared.connectedScenes
                    .filter { $0.activationState == .foregroundActive }
                    .compactMap { $0 as? UIWindowScene }
                    .first

                if let scene = activeScene {
                    SKStoreReviewController.requestReview(in: scene)
                    print("⚡️ [UnitDownReview] SKStoreReviewController.requestReview(in:scene) called")
                    call.resolve(["requested": true])
                } else {
                    // No active UIWindowScene — suppress silently
                    print("⚡️ [UnitDownReview] no active UIWindowScene, skipping review request")
                    call.resolve(["requested": false])
                }
            } else {
                // iOS < 14: legacy class method (deprecated in iOS 17 but still functional)
                SKStoreReviewController.requestReview()
                print("⚡️ [UnitDownReview] SKStoreReviewController.requestReview() called (legacy)")
                call.resolve(["requested": true])
            }
        }
    }
}
