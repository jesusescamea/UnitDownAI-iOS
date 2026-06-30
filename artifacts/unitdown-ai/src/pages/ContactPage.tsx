import { useLocation } from "wouter";
import {
  ThermometerSnowflake,
  ArrowLeft,
  Mail,
  Clock,
  Trash2,
  Download,
  ShieldCheck,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSeoHead } from "@/lib/useSeoHead";

interface ContactCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  cta: string;
  href: string;
  external?: boolean;
}

function ContactCard({ icon: Icon, title, description, cta, href, external }: ContactCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 ring-1 ring-blue-200 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
      >
        {cta}
        {external && <ExternalLink className="w-3 h-3" />}
      </a>
    </div>
  );
}

export default function ContactPage() {
  const [, navigate] = useLocation();

  useSeoHead({
    title: "Contact & Data Requests | UnitDown AI",
    description:
      "Contact UnitDown AI support — submit data access requests, account deletion requests, report bugs, or get help with your subscription.",
    canonical: "https://unitdown.org/contact",
    ogType: "website",
  });

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
          <Mail className="w-7 h-7 text-slate-500 flex-shrink-0 mt-0.5" />
          <h1 className="text-3xl font-extrabold text-slate-900">Contact & Data Requests</h1>
        </div>
        <p className="text-sm text-slate-500 mb-10">Last updated: June 30, 2026</p>

        <div className="space-y-10 text-slate-700 text-sm leading-relaxed">

          {/* ── Primary contact ── */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">1. General Support</h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Email Support</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    For all questions, issues, and requests. This is our primary support channel.
                  </p>
                  <a
                    href="mailto:unitdownsupport@gmail.com"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-blue-600 hover:underline"
                  >
                    unitdownsupport@gmail.com
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-slate-100 flex items-start gap-3">
                <Clock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  <strong className="text-slate-700">Response time:</strong> We aim to respond within
                  2 business days for general questions and within 5 business days for data requests.
                  Response times may vary during high-volume periods.
                </p>
              </div>
            </div>
          </section>

          {/* ── Data requests ── */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">2. Data Rights & Requests</h2>
            <p className="text-slate-600 mb-4">
              Depending on your location, you may have rights under GDPR, CCPA, or other applicable
              privacy laws to access, correct, delete, or restrict processing of your personal data.
              Submit any of the following requests by emailing{" "}
              <a href="mailto:unitdownsupport@gmail.com" className="text-blue-600 hover:underline font-semibold">
                unitdownsupport@gmail.com
              </a>{" "}
              with the subject line matching the request type.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ContactCard
                icon={Download}
                title="Access My Data"
                description='Request a copy of all personal data we hold associated with your account. Use subject line "Data Access Request".'
                cta="Email a Data Access Request"
                href="mailto:unitdownsupport@gmail.com?subject=Data Access Request&body=Please provide a copy of all personal data associated with my account.%0A%0AAccount email: "
              />
              <ContactCard
                icon={Trash2}
                title="Delete My Account & Data"
                description='Request deletion of your account and all associated data. You can also delete directly from the Account page in the app. Use subject line "Account Deletion Request".'
                cta="Email an Account Deletion Request"
                href="mailto:unitdownsupport@gmail.com?subject=Account Deletion Request&body=Please delete my account and all associated personal data.%0A%0AAccount email: "
              />
              <ContactCard
                icon={ShieldCheck}
                title="Data Correction Request"
                description='Request correction of inaccurate personal data associated with your account. Use subject line "Data Correction Request".'
                cta="Email a Data Correction Request"
                href="mailto:unitdownsupport@gmail.com?subject=Data Correction Request&body=I would like to correct the following information on my account:%0A%0AAccount email: "
              />
              <ContactCard
                icon={ShieldCheck}
                title="Opt-Out of Data Processing"
                description="Request that we restrict or stop processing your personal data for non-essential purposes. Required by CCPA and GDPR where applicable."
                cta="Email an Opt-Out Request"
                href="mailto:unitdownsupport@gmail.com?subject=Data Processing Opt-Out&body=I would like to opt out of non-essential data processing.%0A%0AAccount email: "
              />
            </div>
          </section>

          {/* ── Bug reports / feedback ── */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">3. Bug Reports & Feedback</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <ContactCard
                icon={MessageSquare}
                title="Report a Bug"
                description="Describe what happened, what you expected, and your device/browser. Screenshots help."
                cta="Email a Bug Report"
                href="mailto:unitdownsupport@gmail.com?subject=Bug Report&body=Device / Browser: %0AWhat happened: %0AWhat I expected: "
              />
              <ContactCard
                icon={MessageSquare}
                title="Feature Suggestion"
                description="Have an idea for UnitDown AI? We'd love to hear from HVAC professionals."
                cta="Send a Feature Suggestion"
                href="mailto:unitdownsupport@gmail.com?subject=Feature Suggestion&body=I'd like to suggest: "
              />
            </div>
          </section>

          {/* ── Subscription help ── */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">4. Subscription & Billing Help</h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 text-sm text-slate-600">
              <div>
                <p className="font-semibold text-slate-800 mb-1">Cancel your subscription</p>
                <p>
                  UnitDown AI Pro subscriptions are managed by Apple. To cancel, go to{" "}
                  <strong>iPhone Settings → [Your Name] → Subscriptions → UnitDown AI → Cancel</strong>.
                  Cancellation takes effect at the end of the current billing period.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-800 mb-1">Restore a purchase</p>
                <p>
                  If you subscribed on one device and need to restore Pro access on another, use the
                  "Restore Purchases" option inside the app upgrade screen. Both devices must be signed
                  in to the same Apple ID.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-800 mb-1">Request a refund</p>
                <p>
                  Refunds for Apple In-App Purchases are handled by Apple, not UnitDown AI. Visit{" "}
                  <a
                    href="https://reportaproblem.apple.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    reportaproblem.apple.com
                  </a>{" "}
                  to request a refund from Apple.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-800 mb-1">Other billing questions</p>
                <p>
                  Email us at{" "}
                  <a href="mailto:unitdownsupport@gmail.com?subject=Billing Question" className="text-blue-600 hover:underline font-semibold">
                    unitdownsupport@gmail.com
                  </a>{" "}
                  with the subject "Billing Question" and your account email address.
                </p>
              </div>
            </div>
          </section>

          {/* ── Mailing address ── */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">5. Legal Notices</h2>
            <p>
              For formal legal notices (DMCA takedown requests, subpoenas, court orders), contact us at{" "}
              <a href="mailto:unitdownsupport@gmail.com" className="text-blue-600 hover:underline font-semibold">
                unitdownsupport@gmail.com
              </a>{" "}
              with the subject line "Legal Notice." We respond to verified legal process within the
              timeframe required by applicable law.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-slate-200">
          <Button onClick={() => navigate("/legal")} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Legal Center
          </Button>
        </div>
      </main>
    </div>
  );
}
