import { useState } from "react";
import { useLocation } from "wouter";
import { ThermometerSnowflake, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSeoHead } from "@/lib/useSeoHead";

type Tab = "terms" | "privacy" | "safety";

export default function LegalPage() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("terms");

  useSeoHead({
    title: "Legal | UnitDown AI",
    description:
      "Terms of service, privacy policy, and safety disclaimer for UnitDown AI — commercial HVAC diagnostic tool.",
    canonical: "https://unitdown.org/legal",
    ogType: "website",
  });

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
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Legal</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: May 7, 2026</p>

        <div className="flex gap-2 mb-10 border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setTab("terms")}
            className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              tab === "terms" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => setTab("privacy")}
            className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ml-4 ${
              tab === "privacy" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setTab("safety")}
            className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ml-4 ${
              tab === "safety" ? "border-amber-600 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Safety Disclaimer
          </button>
        </div>

        {/* ── TERMS OF SERVICE ── */}
        {tab === "terms" && (
          <div className="prose prose-slate max-w-none space-y-8 text-slate-700 text-sm leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
              <p>By accessing or using UnitDown AI ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">2. Description of Service — Informational Tool Only</h2>
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
              <p className="mt-2">All diagnostic outputs are for informational purposes only. Always verify results with a licensed HVAC technician and manufacturer documentation before performing any repairs, replacements, or system modifications.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">4. User Responsibility and Safe Work Practices</h2>
              <p>By using the Service, you acknowledge and agree that:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>HVAC service involves serious hazards including high voltage electrical systems, rotating equipment, pressurized refrigerant systems, combustible fuels, carbon monoxide, hot surfaces, sharp sheet metal, and moving mechanical parts</li>
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
              <p>Your use of the Service is also governed by our <button onClick={() => setTab("privacy")} className="text-blue-600 hover:underline font-semibold">Privacy Policy</button>, which is incorporated into these Terms by reference.</p>
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
        )}

        {/* ── PRIVACY POLICY ── */}
        {tab === "privacy" && (
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
              <p>If you use the Service without an account, we assign an anonymous session identifier stored in your browser's local storage. This ID tracks your diagnostic usage count and free tier limits. It is not linked to your name or personal identity.</p>
              <h3 className="font-semibold text-slate-800 mt-4 mb-1">Diagnostic Inputs</h3>
              <p>When you run a diagnostic, we receive the HVAC symptom description you provide. This is sent to our AI processing service to generate results. We may retain this data to improve service quality. Do not include personally identifiable information in symptom descriptions.</p>
              <h3 className="font-semibold text-slate-800 mt-4 mb-1">Diagnostic History</h3>
              <p>If you are signed in, your diagnostic history is stored server-side linked to your account, enabling cross-device access. Guest users' history is stored only in browser local storage and is not accessible from other devices.</p>
              <h3 className="font-semibold text-slate-800 mt-4 mb-1">Payment Information</h3>
              <p>Payment is processed by Apple In-App Purchase. <strong>UnitDown AI does not store your credit card number, CVV, or sensitive payment details.</strong> All billing is managed through your Apple ID. See <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">Apple's Privacy Policy</a>.</p>
              <h3 className="font-semibold text-slate-800 mt-4 mb-1">Usage and Technical Data</h3>
              <p>We may collect standard server logs (IP addresses, browser type, pages accessed, timestamps) for security and operational purposes. This data is not sold or shared with third parties for marketing.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>To deliver and improve HVAC diagnostic results</li>
                <li>To enforce free tier limits and manage paid subscriptions</li>
                <li>To store and sync your diagnostic history across devices when signed in</li>
                <li>To authenticate your identity and maintain secure sessions via Clerk</li>
                <li>To detect and prevent abuse or fraudulent activity</li>
                <li>To send subscription-related communications (if you have an active subscription)</li>
              </ul>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">4. AI Processing and Limitations</h2>
              <p>Diagnostic outputs are generated by AI language models and our proprietary HVAC knowledge base. <strong>AI outputs are probabilistic and informational — they may be incomplete or inaccurate</strong> and are not guaranteed to apply to your specific equipment or conditions. UnitDown AI is not a substitute for professional inspection or manufacturer documentation.</p>
              <p className="mt-2">Your diagnostic inputs are transmitted to our AI processing infrastructure. We do not use your inputs to train AI models without additional consent.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">5. Cookies, Local Storage, and Sessions</h2>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Local Storage:</strong> Stores your anonymous session ID, pro status cache, diagnostic history (guest users), and usage count.</li>
                <li><strong>Session Cookies:</strong> Clerk uses HTTP-only cookies for secure authenticated session management. Required for the login feature.</li>
                <li><strong>Authentication Cookies:</strong> Clerk may set additional cookies for identity verification and session continuity.</li>
              </ul>
              <p className="mt-2">We do not use third-party advertising cookies or tracking pixels.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">6. Data Sharing</h2>
              <p>We do not sell your personal information. We may share data with:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Clerk:</strong> Authentication and identity management. <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Clerk's Privacy Policy</a> applies.</li>
                <li><strong>OpenAI:</strong> HVAC diagnostic inputs are processed by AI. <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI's privacy policy</a> applies.</li>
                <li><strong>Apple In-App Purchase:</strong> Payment processing and subscription management.</li>
                <li><strong>Infrastructure providers:</strong> Hosting and database services necessary to operate the platform.</li>
              </ul>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">7. Data Retention</h2>
              <p>Authenticated users' diagnostic history is retained while your account is active. Anonymous session data is retained for operational purposes. Payment records are retained as required by financial regulations. You may request deletion by contacting us.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">8. Your Rights</h2>
              <p>Depending on your location, you may have rights to request access to, deletion of, or restrictions on processing of your data. Contact us at <a href="mailto:unitdownsupport@gmail.com" className="text-blue-600 hover:underline font-semibold">unitdownsupport@gmail.com</a> to exercise these rights.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">9. Children's Privacy</h2>
              <p>UnitDown AI is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">10. Security</h2>
              <p>We implement industry-standard security measures including HTTPS encryption for all data in transit and secure credential management via Clerk. No method of internet transmission is 100% secure, and we cannot guarantee absolute security.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">11. Changes to This Policy</h2>
              <p>We may update this Privacy Policy periodically. Continued use of the Service after changes are posted constitutes acceptance of the revised policy.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">12. Contact Us</h2>
              <p>Questions about this Privacy Policy? Contact us at <a href="mailto:unitdownsupport@gmail.com" className="text-blue-600 hover:underline font-semibold">unitdownsupport@gmail.com</a>.</p>
            </section>
          </div>
        )}

        {/* ── SAFETY DISCLAIMER ── */}
        {tab === "safety" && (
          <div className="space-y-8 text-slate-700 text-sm leading-relaxed">

            <div className="rounded-2xl bg-amber-50 border border-amber-300 p-6">
              <h2 className="text-base font-extrabold text-amber-900 mb-3 uppercase tracking-wide">HVAC Safety Notice</h2>
              <p className="text-sm font-semibold text-amber-900 leading-relaxed">
                Safety Notice: HVAC service can involve high voltage electricity, rotating equipment, pressurized refrigerants, combustible fuels, carbon monoxide hazards, hot surfaces, sharp metal, and other serious risks. UnitDown AI is for informational troubleshooting support only. Always follow lockout/tagout procedures, wear proper PPE, verify conditions with approved instruments, follow manufacturer service literature, and comply with all applicable codes and jobsite safety procedures. Do not rely on UnitDown AI for emergency, life-safety, or final repair decisions.
              </p>
            </div>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Known HVAC Service Hazards</h2>
              <p className="mb-3">Commercial and residential HVAC service involves the following serious hazard categories. This list is not exhaustive. Always consult manufacturer documentation and employer safety procedures for the specific equipment and task.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>High Voltage Electrical:</strong> HVAC equipment operates at voltages up to 480V three-phase or higher. Improper contact can cause electrocution, severe burns, or death. Always verify de-energized status with an approved meter before touching conductors.</li>
                <li><strong>Lockout/Tagout (LOTO):</strong> All energy sources (electrical, refrigerant pressure, gas) must be properly locked out and tagged out before performing service work. Follow OSHA 29 CFR 1910.147 and applicable employer procedures.</li>
                <li><strong>Rotating Equipment:</strong> Blower assemblies, condenser fans, compressors, belts, and pulleys can cause crush injuries, lacerations, or entanglement. Never operate equipment with guards removed.</li>
                <li><strong>Pressurized Refrigerant Systems:</strong> Refrigerant circuits operate under significant pressure. Improper handling can cause high-pressure injection injuries, frostbite, or asphyxiation. Use only approved refrigerant handling equipment and follow EPA Section 608 requirements.</li>
                <li><strong>Combustion and Gas-Fired Equipment:</strong> Gas furnaces, boilers, and heat strips involve combustion risks. Improper service can result in gas leaks, fire, explosion, or carbon monoxide (CO) poisoning.</li>
                <li><strong>Carbon Monoxide (CO):</strong> Cracked heat exchangers or improper combustion can release CO — an odorless, colorless gas that can be fatal. Never service combustion equipment without CO detection capability.</li>
                <li><strong>Hot Surfaces:</strong> Heat exchangers, flue pipes, electric heat strips, and compressor discharge lines operate at high temperatures and can cause severe burns on contact.</li>
                <li><strong>Sharp Sheet Metal:</strong> HVAC casings, ductwork, and internal components often have sharp edges. Cut-resistant gloves are recommended when working inside units.</li>
                <li><strong>Personal Protective Equipment (PPE):</strong> Appropriate PPE must be selected for each task — including but not limited to: insulated gloves, safety glasses, face shields, cut-resistant gloves, and arc flash protection where applicable.</li>
                <li><strong>Manufacturer Documentation:</strong> Always consult the specific manufacturer's service literature, wiring diagrams, and installation instructions. Generic procedures may not apply to all equipment.</li>
                <li><strong>Code Compliance:</strong> All service work must comply with applicable local mechanical codes, electrical codes (NEC), refrigerant regulations, and authority having jurisdiction (AHJ) requirements.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Limitations of UnitDown AI</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>UnitDown AI provides probabilistic, AI-generated diagnostic suggestions. Outputs may be incomplete, inaccurate, or not applicable to your specific equipment.</li>
                <li>The Service does not have access to your equipment's actual condition, age, installation specifics, or service history.</li>
                <li>UnitDown AI should never be used as the sole basis for a repair decision.</li>
                <li>The Service does not substitute for reading manufacturer wiring diagrams, service bulletins, or technical service manuals.</li>
                <li>Do not use UnitDown AI in emergency situations or where life safety is immediately at risk. Contact qualified personnel immediately in those situations.</li>
              </ul>
            </section>

            <div className="rounded-xl bg-slate-100 border border-slate-200 p-5 text-xs text-slate-500 leading-relaxed">
              <strong>Disclaimer:</strong> This Safety Disclaimer is provided for informational purposes only and does not constitute legal, safety, or regulatory advice. UnitDown AI and its operators disclaim all liability for injury, death, property damage, or other losses arising from failure to follow safety procedures, manufacturer instructions, applicable codes, or professional judgment. Always consult a licensed HVAC professional for any work beyond your training and certification level.
            </div>
          </div>
        )}

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
