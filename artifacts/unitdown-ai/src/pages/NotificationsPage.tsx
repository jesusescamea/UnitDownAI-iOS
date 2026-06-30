import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ThermometerSnowflake, ArrowLeft, Bell, BellOff, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSeoHead } from "@/lib/useSeoHead";

function getPushPermission(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export default function NotificationsPage() {
  const [, navigate] = useLocation();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(getPushPermission);
  const [requesting, setRequesting] = useState(false);
  const [justGranted, setJustGranted] = useState(false);

  useSeoHead({
    title: "Notification Policy | UnitDown AI",
    description:
      "UnitDown AI notification policy — when and why we send push notifications and how to manage your notification preferences.",
    canonical: "https://unitdown.org/notifications",
    ogType: "website",
  });

  useEffect(() => {
    setPermission(getPushPermission());
  }, []);

  async function handleRequest() {
    if (typeof Notification === "undefined") return;
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") setJustGranted(true);
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate("/legal")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-semibold">Legal</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center">
              <ThermometerSnowflake className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-slate-900">UnitDown AI</span>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-start gap-3 mb-2">
          <Bell className="w-7 h-7 text-orange-500 flex-shrink-0 mt-0.5" />
          <h1 className="text-3xl font-extrabold text-slate-900">Notification Policy</h1>
        </div>
        <p className="text-sm text-slate-500 mb-10">Last updated: June 30, 2026</p>

        <div className="space-y-8 text-slate-700 text-sm leading-relaxed">

          {/* ── Push Consent UI ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Your Push Notification Permission</h2>
            <p className="text-xs text-slate-500 mb-5">
              Manage browser push notifications for UnitDown AI on this device.
            </p>

            {permission === "unsupported" && (
              <div className="flex gap-3 rounded-xl bg-slate-100 border border-slate-200 p-4">
                <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  Push notifications are not supported in this browser or environment. On iOS, install
                  UnitDown AI to your home screen via "Add to Home Screen" to enable notifications.
                </p>
              </div>
            )}

            {permission === "default" && (
              <div className="space-y-4">
                <div className="flex gap-3 rounded-xl bg-orange-50 border border-orange-200 p-4">
                  <Bell className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-800 leading-relaxed font-medium">
                    You have not yet granted notification permission. Tap below to enable notifications
                    for service reminders and job updates.
                  </p>
                </div>
                <Button
                  onClick={handleRequest}
                  disabled={requesting}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl h-11 px-6"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  {requesting ? "Requesting…" : "Enable Notifications"}
                </Button>
              </div>
            )}

            {permission === "granted" && (
              <div className="flex gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">
                    {justGranted ? "Notifications enabled — thank you!" : "Notifications are enabled"}
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    To disable notifications, open your browser or device settings and revoke permission
                    for this site.
                  </p>
                </div>
              </div>
            )}

            {permission === "denied" && (
              <div className="flex gap-3 rounded-xl bg-slate-100 border border-slate-200 p-4">
                <BellOff className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-slate-700">Notifications are blocked</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    You previously denied notification permission. To re-enable, go to your browser
                    settings → Site Settings → Notifications → find UnitDown AI and allow notifications.
                  </p>
                </div>
              </div>
            )}
          </div>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">1. What Notifications We Send</h2>
            <p className="mb-3">
              UnitDown AI may send the following types of push notifications when you have granted
              permission:
            </p>
            <div className="space-y-3">
              {[
                {
                  label: "Service reminders",
                  detail:
                    "Reminders for scheduled maintenance, filter changes, or follow-up service calls that you configure within the app.",
                },
                {
                  label: "Job mode updates",
                  detail:
                    "Alerts when a job record is synced, a timeline event is confirmed, or an offline sync completes.",
                },
                {
                  label: "Account and subscription notices",
                  detail:
                    "Critical account-related notices such as subscription renewal reminders or payment issues that require your attention.",
                },
                {
                  label: "App updates and feature announcements",
                  detail:
                    "Occasional announcements about significant new features or improvements to UnitDown AI. These are infrequent and optional.",
                },
              ].map(({ label, detail }) => (
                <div key={label} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-sm font-bold text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">2. What We Will Never Send</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Third-party advertising or sponsored messages</li>
              <li>Marketing from external companies or partners</li>
              <li>Notifications that reveal sensitive diagnostic or customer information to unauthorized parties</li>
              <li>Automated messages more than once per day for non-urgent categories</li>
              <li>Notifications after you revoke permission or unsubscribe</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">3. How to Manage Notifications</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">Browser / PWA</h3>
                <p>
                  Open your browser settings → Privacy &amp; Security → Site Settings → Notifications →
                  find unitdown.org and change to "Block" to disable all notifications from UnitDown AI.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">iOS Home Screen App</h3>
                <p>
                  Open Settings → Notifications → UnitDown AI → toggle Allow Notifications off. You can
                  also adjust notification style, sounds, and badges individually.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">Android</h3>
                <p>
                  Open Settings → Apps → your browser → Notifications → Site Settings →
                  find unitdown.org and disable. On Android with the installed PWA, go to Settings →
                  Apps → UnitDown AI → Notifications.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">Email notifications</h3>
                <p>
                  Subscription-related emails are sent to the address on your account. To unsubscribe
                  from non-essential emails, contact us at{" "}
                  <a
                    href="mailto:unitdownsupport@gmail.com"
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    unitdownsupport@gmail.com
                  </a>
                  .
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">4. Notification Data and Privacy</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Push notification permission status is determined by your browser and stored locally on
                your device. We do not transmit your raw permission state to our servers.
              </li>
              <li>
                If you are a signed-in user, we may store your notification preferences (e.g., which
                reminder categories are enabled) server-side to sync across devices.
              </li>
              <li>
                We do not share notification targeting data with advertising networks. For full data
                practices, see our{" "}
                <button
                  onClick={() => navigate("/privacy")}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Privacy Policy
                </button>
                .
              </li>
            </ul>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-slate-200">
          <Button
            onClick={() => navigate("/legal")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Legal Center
          </Button>
        </div>
      </main>
    </div>
  );
}
