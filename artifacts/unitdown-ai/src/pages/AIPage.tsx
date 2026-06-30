import { useLocation } from "wouter";
import { ThermometerSnowflake, ArrowLeft, Bot, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSeoHead } from "@/lib/useSeoHead";

export default function AIPage() {
  const [, navigate] = useLocation();

  useSeoHead({
    title: "AI Limitations & Transparency | UnitDown AI",
    description:
      "How UnitDown AI's diagnostic engine works, what AI models power it, the limitations of AI-generated outputs, and how to interpret results responsibly.",
    canonical: "https://unitdown.org/ai",
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
          <Bot className="w-7 h-7 text-violet-500 flex-shrink-0 mt-0.5" />
          <h1 className="text-3xl font-extrabold text-slate-900">AI Limitations & Transparency</h1>
        </div>
        <p className="text-sm text-slate-500 mb-10">Last updated: June 30, 2026</p>

        <div className="space-y-8 text-slate-700 text-sm leading-relaxed">

          <div className="rounded-2xl bg-violet-50 border border-violet-200 p-6">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-extrabold text-violet-900 mb-1">AI is a tool, not a technician.</h2>
                <p className="text-sm text-violet-800 leading-relaxed">
                  UnitDown AI uses large language models to assist HVAC troubleshooting. Every output is
                  probabilistic — it reflects patterns in training data, not direct inspection of your
                  equipment. Always verify results with instruments, manufacturer documentation, and
                  your own professional judgment.
                </p>
              </div>
            </div>
          </div>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">1. How the Diagnostic Engine Works</h2>
            <p className="mb-3">
              When you submit an HVAC symptom description, UnitDown AI processes it through two layers:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Proprietary Knowledge Base Scoring:</strong> Your symptom description is matched
                against a curated database of HVAC fault signatures, scored by keyword relevance, category
                weight, and contradiction detection. This produces a ranked list of candidate diagnoses
                before the AI step.
              </li>
              <li>
                <strong>Large Language Model (LLM) Processing:</strong> The top candidate diagnoses are
                passed to a large language model (currently OpenAI GPT-4 class models via Replit's AI
                infrastructure). The LLM generates natural-language explanations, step-by-step checks,
                meter readings, and recommended actions — contextualizing the knowledge base results in
                plain language.
              </li>
              <li>
                <strong>Confidence Scores:</strong> The confidence percentage shown on each diagnosis
                reflects the knowledge base scoring engine's match strength — it is not a probability
                that the diagnosis is correct. A 90% confidence score means the symptom description
                matched that fault signature very closely, not that there is a 90% chance you will find
                that fault.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">2. What AI Cannot Do</h2>
            <div className="space-y-3">
              {[
                {
                  icon: AlertCircle,
                  color: "text-red-500",
                  bg: "bg-red-50",
                  border: "border-red-200",
                  label: "Physically inspect your equipment",
                  detail: "AI has no access to your unit's actual condition, refrigerant charge, electrical state, or service history. It responds only to what you describe in text.",
                },
                {
                  icon: AlertCircle,
                  color: "text-red-500",
                  bg: "bg-red-50",
                  border: "border-red-200",
                  label: "Read manufacturer-specific wiring diagrams",
                  detail: "AI does not have access to your specific unit's wiring diagrams, service bulletins, or installation manuals. Always consult the original documentation.",
                },
                {
                  icon: AlertCircle,
                  color: "text-red-500",
                  bg: "bg-red-50",
                  border: "border-red-200",
                  label: "Replace professional judgment",
                  detail: "Diagnostic outputs are informational suggestions, not professional engineering opinions. A licensed technician with instruments on-site can observe things AI cannot.",
                },
                {
                  icon: AlertCircle,
                  color: "text-red-500",
                  bg: "bg-red-50",
                  border: "border-red-200",
                  label: "Guarantee accuracy",
                  detail: "LLM outputs can be confidently wrong. The model may generate plausible-sounding information that does not apply to your equipment. Always verify before acting.",
                },
                {
                  icon: AlertCircle,
                  color: "text-red-500",
                  bg: "bg-red-50",
                  border: "border-red-200",
                  label: "Provide emergency guidance",
                  detail: "Do not use UnitDown AI for emergency decisions, active gas leaks, electrical arc flash events, or any situation where life safety is immediately at risk.",
                },
              ].map(({ icon: Icon, color, bg, border, label, detail }) => (
                <div key={label} className={`rounded-xl ${bg} border ${border} p-4 flex gap-3`}>
                  <Icon className={`w-4 h-4 ${color} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{label}</p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">3. What AI Does Well</h2>
            <div className="space-y-3">
              {[
                {
                  label: "Pattern matching on common HVAC faults",
                  detail: "The diagnostic engine is tuned on hundreds of commercial and residential HVAC fault patterns. It performs well on common RTU, split-system, and chiller fault categories.",
                },
                {
                  label: "Generating structured troubleshooting sequences",
                  detail: "AI excels at turning a fault description into a logical, step-by-step check sequence that you can follow in the field.",
                },
                {
                  label: "Identifying what to measure and where",
                  detail: "Meter check steps — voltages, amperages, superheat, subcooling, static pressure — are generated based on the suspected fault category.",
                },
                {
                  label: "Surfacing alternative diagnoses",
                  detail: "Pro users receive ranked alternative diagnoses, helping you consider other potential causes before committing to a repair path.",
                },
                {
                  label: "Explaining technical concepts in plain language",
                  detail: "Terminology mode lets you adjust output complexity, from beginner-friendly explanations to advanced technician-level detail.",
                },
              ].map(({ label, detail }) => (
                <div key={label} className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{label}</p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">4. How Your Data Is Used by the AI</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Your HVAC symptom descriptions are sent to OpenAI's API for processing. OpenAI's API
                data usage policies apply. As of the current date, OpenAI does not use API inputs to
                train production models by default. See{" "}
                <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">
                  OpenAI's privacy policy
                </a>{" "}
                for current terms.
              </li>
              <li>
                UnitDown AI does not use your diagnostic inputs to train or fine-tune any AI model
                without your explicit additional consent.
              </li>
              <li>
                <strong>Do not include personally identifiable information</strong> (customer names,
                addresses, phone numbers, or any private business information) in your symptom
                descriptions. Symptom fields are intended for equipment fault descriptions only.
              </li>
              <li>
                Diagnostic inputs and results may be retained to improve the UnitDown AI knowledge
                base and scoring engine. See our{" "}
                <button onClick={() => navigate("/privacy")} className="text-blue-600 hover:underline font-semibold">
                  Privacy Policy
                </button>{" "}
                for full data retention details.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">5. Interpreting Outputs Responsibly</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Treat every diagnostic result as a <em>hypothesis to test</em>, not a confirmed finding.
                Confirm each step with a calibrated meter or approved test instrument.
              </li>
              <li>
                A high confidence score does not mean the diagnosis is correct — it means the symptom
                description matched that fault pattern closely. Symptoms can match multiple faults.
              </li>
              <li>
                If an output seems incorrect or unsafe, trust your training and instruments over the
                AI suggestion. Report issues at{" "}
                <a href="mailto:unitdownsupport@gmail.com" className="text-blue-600 hover:underline font-semibold">
                  unitdownsupport@gmail.com
                </a>
                .
              </li>
              <li>
                UnitDown AI output quality improves with detailed, specific symptom descriptions. Vague
                inputs produce less useful results. Include what you have measured, what you observe, and
                what the unit is doing — not just the complaint.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">6. AI Model Versioning</h2>
            <p>
              UnitDown AI uses OpenAI GPT-4 class models. The specific model version may change without
              notice as we update to newer or better-performing models. All models used are subject to
              OpenAI's terms and safety guidelines. We do not deploy uncensored, fine-tuned, or
              experimental models.
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
