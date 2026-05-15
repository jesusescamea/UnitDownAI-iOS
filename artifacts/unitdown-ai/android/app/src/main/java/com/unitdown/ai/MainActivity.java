package com.unitdown.ai;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

/**
 * UnitDown AI — Capacitor shell for https://unitdown.org
 *
 * External-browser routing strategy
 * ──────────────────────────────────
 * Capacitor's built-in launchIntent() already sends any URL whose host is
 * NOT in allowNavigation to the system browser via Intent.ACTION_VIEW.
 * That covers:
 *   • Stripe checkout  (checkout.stripe.com)
 *   • Stripe portal    (billing.stripe.com)
 *
 * Google OAuth is a special case: Clerk opens it as a popup (window.open),
 * which fires onCreateWindow — not shouldOverrideUrlLoading.
 * Capacitor's default BridgeWebChromeClient does NOT implement onCreateWindow,
 * so the popup is silently dropped and "Continue with Google" appears broken.
 *
 * The fix: override onCreateWindow to capture the target URL and hand it to
 * Chrome via Intent.ACTION_VIEW, keeping Google happy (no WebView user-agent
 * rejection) and preserving all other bridge functionality.
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();

        // Allow window.open() to reach onCreateWindow. Without this flag the
        // call is silently ignored and Google OAuth never leaves the WebView.
        webView.getSettings().setSupportMultipleWindows(true);

        // Extend the existing BridgeWebChromeClient so console logging,
        // file chooser, and permission prompts still work via super.*.
        webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog,
                                          boolean isUserGesture,
                                          android.os.Message resultMsg) {
                // Attach a lightweight capture WebView whose sole job is to
                // receive the first URL that window.open() resolves to and
                // forward it to the system browser, then do nothing else.
                WebView capture = new WebView(MainActivity.this);
                capture.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v,
                                                            WebResourceRequest req) {
                        String url = req.getUrl().toString();
                        try {
                            startActivity(
                                    new Intent(Intent.ACTION_VIEW, Uri.parse(url))
                            );
                        } catch (Exception ignored) {
                            // No browser available — fail silently rather than crash.
                        }
                        return true;
                    }
                });

                WebView.WebViewTransport transport =
                        (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(capture);
                resultMsg.sendToTarget();
                return true;
            }
        });
    }
}
