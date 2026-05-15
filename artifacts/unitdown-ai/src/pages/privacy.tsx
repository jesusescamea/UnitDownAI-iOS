import { useLocation } from "wouter";
import { ThermometerSnowflake, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-semibold">Back</span>
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
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-10">Last updated: May 7, 2026</p>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">1. Overview</h2>
            <p>UnitDown AI ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information when you use our commercial HVAC diagnostic service.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">2. Information We Collect</h2>

            <h3 className="font-semibold text-slate-800 mb-1">Account Information</h3>
            <p>If you create an account or sign in, we collect your email address and login method (email/password or Google OAuth) through Clerk, our authentication provider. Clerk manages credential storage and session security on our behalf. We receive your Clerk user ID and associated email to link your account to your subscription and diagnostic history.</p>

            <h3 className="font-semibold text-slate-800 mt-4 mb-1">Anonymous Session Identifier</h3>
            <p>If you use the Service without an account, we assign an anonymous session identifier stored in your browser's local storage. This ID is used to track your diagnostic usage count and free tier limits. It is not linked to your name, email, or personal identity.</p>

            <h3 className="font-semibold text-slate-800 mt-4 mb-1">Diagnostic Inputs</h3>
            <p>When you run a diagnostic, we receive the HVAC symptom description you provide. This data is processed by our AI service to generate diagnostic results. We may retain diagnostic inputs to improve service quality. <strong>Do not include personally identifiable information, customer names, or sensitive business information in your symptom descriptions.</strong></p>

            <h3 className="font-semibold text-slate-800 mt-4 mb-1">Diagnostic History</h3>
            <p>If you are signed in with an account, your diagnostic history (symptom descriptions and results) is stored on our servers linked to your user account. This enables cross-device access to your history. Guest users' diagnostic history is stored only in your browser's local storage and is not accessible from other devices.</p>

            <h3 className="font-semibold text-slate-800 mt-4 mb-1">Payment Information</h3>
            <p>If you subscribe to a paid plan, payment is processed by Apple In-App Purchase. <strong>UnitDown AI does not store your credit card number, CVV, or other sensitive payment details.</strong> All billing is managed through your Apple ID and is subject to Apple's privacy policy and terms. For more information, see <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">Apple's Privacy Policy</a>.</p>

            <h3 className="font-semibold text-slate-800 mt-4 mb-1">Usage and Technical Data</h3>
            <p>We may collect standard server logs including IP addresses, browser type, pages accessed, and timestamps for security and operational purposes. This data is not sold or shared with third parties for marketing.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To deliver and improve HVAC diagnostic results</li>
              <li>To enforce free tier limits and manage paid subscriptions</li>
              <li>To store and sync your diagnostic history across devices when you are signed in</li>
              <li>To authenticate your identity and maintain secure sessions via Clerk</li>
              <li>To detect and prevent abuse or fraudulent activity</li>
              <li>To send subscription-related communications (if you have an active subscription)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">4. AI Processing and Limitations</h2>
            <p>Diagnostic outputs are generated by AI language models and our proprietary HVAC knowledge base. <strong>AI outputs are probabilistic, informational, and may be incomplete or inaccurate.</strong> They reflect patterns in training data and are not guaranteed to be applicable to your specific equipment, installation, or site conditions. UnitDown AI is not a substitute for professional inspection or manufacturer documentation.</p>
            <p className="mt-2">Your diagnostic inputs are transmitted to our AI processing infrastructure. We do not use your inputs to train or fine-tune AI models without additional consent.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">5. Cookies, Local Storage, and Session Storage</h2>
            <p>We use the following browser storage mechanisms:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Local Storage:</strong> Stores your anonymous session ID, pro status cache, diagnostic history (for guest users), and usage count. You can clear this at any time through your browser settings.</li>
              <li><strong>Session Cookies:</strong> Clerk uses HTTP-only cookies to manage authenticated sessions securely. These cookies are required for the login feature to function.</li>
              <li><strong>Authentication Cookies:</strong> Clerk may set additional cookies necessary for secure identity verification and session continuity across browser restarts.</li>
            </ul>
            <p className="mt-2">We do not use third-party advertising cookies or tracking pixels.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">6. Data Sharing</h2>
            <p>We do not sell your personal information. We may share data with:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Clerk:</strong> Authentication and identity management. <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Clerk's Privacy Policy</a> applies.</li>
              <li><strong>OpenAI:</strong> Your HVAC diagnostic inputs are processed by AI to generate results. <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI's privacy policy</a> applies to this processing.</li>
              <li><strong>Apple In-App Purchase:</strong> Payment processing and subscription management.</li>
              <li><strong>Infrastructure providers:</strong> Hosting and database services necessary to operate the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">7. Data Retention</h2>
            <p>Authenticated users' diagnostic history is retained as long as your account is active. Anonymous session data is retained for operational purposes. Payment and subscription records are retained as required by financial regulations. You may request deletion of your account data by contacting us.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">8. Your Rights</h2>
            <p>Depending on your location, you may have rights to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Request access to data associated with your account or session</li>
              <li>Request deletion of your data</li>
              <li>Opt out of certain data processing activities</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact us at <a href="mailto:unitdownsupport@gmail.com" className="text-blue-600 hover:underline font-semibold">unitdownsupport@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">9. Children's Privacy</h2>
            <p>UnitDown AI is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">10. Security</h2>
            <p>We implement industry-standard security measures including HTTPS encryption for all data in transit and secure credential management via Clerk. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy periodically. Continued use of the Service after changes are posted constitutes acceptance of the revised policy. We encourage you to review this page periodically.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">12. Contact Us</h2>
            <p>If you have questions or concerns about this Privacy Policy, please contact us at <a href="mailto:unitdownsupport@gmail.com" className="text-blue-600 hover:underline font-semibold">unitdownsupport@gmail.com</a>.</p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-slate-200">
          <Button onClick={() => navigate("/")} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to UnitDown AI
          </Button>
        </div>
      </main>
    </div>
  );
}
