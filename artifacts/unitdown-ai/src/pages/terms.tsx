import { useLocation } from "wouter";
import { ThermometerSnowflake, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
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
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-10">Last updated: May 7, 2026</p>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using UnitDown AI ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">2. Description of Service</h2>
            <p>UnitDown AI provides AI-assisted HVAC diagnostic support. The Service is an <strong>informational troubleshooting assistance tool only</strong>. It is designed to support qualified HVAC technicians and professionals in diagnosing potential equipment issues.</p>
            <p className="mt-2">UnitDown AI <strong>does not replace</strong> and must not be used as a substitute for:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>A licensed HVAC technician or qualified service professional</li>
              <li>Your employer's safety procedures or standard operating procedures</li>
              <li>Manufacturer service literature, wiring diagrams, or specifications</li>
              <li>Applicable local codes, standards, or regulations</li>
              <li>Professional judgment and on-site inspection</li>
            </ul>
            <p className="mt-2"><strong>You must verify all recommendations before acting on them.</strong> AI-generated outputs are probabilistic and may be incomplete, inaccurate, or inapplicable to your specific equipment, installation, or conditions.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">3. No Guarantees — Disclaimer of Warranties</h2>
            <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. UNITDOWN AI EXPRESSLY DISCLAIMS ALL WARRANTIES INCLUDING BUT NOT LIMITED TO:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Accuracy or completeness of diagnostic results</li>
              <li>Fitness for a particular purpose or equipment type</li>
              <li>Uninterrupted or error-free availability (uptime)</li>
              <li>Successful repair outcome or equipment performance after following any recommendation</li>
              <li>Safety outcome resulting from any action taken based on Service outputs</li>
              <li>Cost savings from use of the Service</li>
            </ul>
            <p className="mt-2">All diagnostic outputs are for <strong>informational purposes only</strong>. Always verify results with a licensed HVAC technician and manufacturer documentation before performing any repairs, replacements, or system modifications.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">4. User Responsibility and Safe Work Practices</h2>
            <p>By using the Service, you acknowledge and agree that:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>HVAC service involves serious hazards including but not limited to high voltage electrical systems, rotating equipment, pressurized refrigerant systems, combustible fuels, carbon monoxide, hot surfaces, sharp sheet metal, and moving mechanical parts</li>
              <li>You are solely responsible for your own safety and the safety of others at the worksite</li>
              <li>You must follow all applicable lockout/tagout (LOTO) procedures before servicing equipment</li>
              <li>You must wear appropriate personal protective equipment (PPE) as required for the task</li>
              <li>You must verify all electrical, refrigerant, and mechanical conditions with approved instruments before acting</li>
              <li>You must follow manufacturer service literature and all applicable local codes, ordinances, and jobsite safety rules</li>
              <li>You must not rely on UnitDown AI for emergency decisions, life-safety decisions, or as your sole basis for any repair action</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">5. Limitation of Liability</h2>
            <p>TO THE FULLEST EXTENT PERMITTED BY LAW, UNITDOWN AI AND ITS OPERATORS SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE, INCLUDING BUT NOT LIMITED TO:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Personal injury or death resulting from actions taken based on diagnostic outputs</li>
              <li>Property damage or equipment damage</li>
              <li>Business losses, downtime, or lost revenue</li>
              <li>Misdiagnosis or incorrect repair based on AI outputs</li>
              <li>Reliance on any AI-generated recommendation</li>
              <li>Data loss or service interruption</li>
            </ul>
            <p className="mt-2">This limitation applies even if UnitDown AI has been advised of the possibility of such damages.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">6. Subscriptions and Billing</h2>
            <p>UnitDown AI offers free and paid subscription plans. Paid plans are billed on a monthly basis through Apple In-App Purchase. By subscribing, you authorize recurring charges to your Apple ID. You may cancel your subscription at any time through Apple Settings → Subscriptions. No refunds are issued for partial billing periods unless required by applicable law or Apple's refund policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">7. Free Tier</h2>
            <p>Free tier users receive up to 5 diagnostic sessions. After exhausting free diagnostics, a free account or paid subscription is required to continue using the Service. UnitDown AI reserves the right to modify free tier limits at any time.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">8. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to reverse engineer, scrape, or extract underlying AI models</li>
              <li>Resell or redistribute diagnostic results without permission</li>
              <li>Submit false, misleading, or harmful inputs to the diagnostic engine</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">9. Intellectual Property</h2>
            <p>All content, branding, and software comprising UnitDown AI are the property of their respective owners and are protected by applicable intellectual property laws. Diagnostic outputs generated through your use of the Service are provided for your personal or business use only.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">10. Privacy</h2>
            <p>Your use of the Service is also governed by our <button onClick={() => navigate("/privacy")} className="text-blue-600 hover:underline font-semibold">Privacy Policy</button>, which is incorporated into these Terms by reference.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">11. Modifications to Terms</h2>
            <p>We reserve the right to update these Terms at any time. Continued use of the Service after changes are posted constitutes acceptance of the revised Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">12. Governing Law</h2>
            <p>These Terms are governed by the laws of the United States. Any disputes arising from these Terms shall be resolved through binding arbitration or in the courts of competent jurisdiction.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">13. Contact</h2>
            <p>For questions about these Terms, contact us at <a href="mailto:unitdownsupport@gmail.com" className="text-blue-600 hover:underline font-semibold">unitdownsupport@gmail.com</a>.</p>
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
