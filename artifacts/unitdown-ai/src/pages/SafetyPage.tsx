import { useLocation } from "wouter";
import { ThermometerSnowflake, ArrowLeft, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSeoHead } from "@/lib/useSeoHead";

export default function SafetyPage() {
  const [, navigate] = useLocation();

  useSeoHead({
    title: "Safety Disclaimer | UnitDown AI",
    description:
      "Safety disclaimer for UnitDown AI — critical safety information for HVAC technicians and known hazards of commercial HVAC service work.",
    canonical: "https://unitdown.org/safety",
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
          <TriangleAlert className="w-7 h-7 text-amber-500 flex-shrink-0 mt-0.5" />
          <h1 className="text-3xl font-extrabold text-slate-900">Safety Disclaimer</h1>
        </div>
        <p className="text-sm text-slate-500 mb-10">Last updated: June 30, 2026</p>

        <div className="space-y-8 text-slate-700 text-sm leading-relaxed">

          <div className="rounded-2xl bg-amber-50 border border-amber-300 p-6">
            <h2 className="text-base font-extrabold text-amber-900 mb-3 uppercase tracking-wide flex items-center gap-2">
              <TriangleAlert className="w-4 h-4" />
              HVAC Safety Notice
            </h2>
            <p className="text-sm font-semibold text-amber-900 leading-relaxed">
              HVAC service can involve high voltage electricity, rotating equipment, pressurized refrigerants,
              combustible fuels, carbon monoxide hazards, hot surfaces, sharp metal, and other serious risks.
              UnitDown AI is an informational troubleshooting support tool only. Always follow lockout/tagout
              procedures, wear proper PPE, verify conditions with approved instruments, follow manufacturer
              service literature, and comply with all applicable codes and jobsite safety procedures.
              Do not rely on UnitDown AI for emergency, life-safety, or final repair decisions.
            </p>
          </div>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">1. Known HVAC Service Hazards</h2>
            <p className="mb-3">
              Commercial and residential HVAC service involves the following serious hazard categories. This list
              is not exhaustive. Always consult manufacturer documentation and employer safety procedures for the
              specific equipment and task.
            </p>
            <ul className="list-disc pl-5 space-y-3">
              <li>
                <strong>High Voltage Electrical:</strong> HVAC equipment operates at voltages up to 480V
                three-phase or higher. Improper contact can cause electrocution, severe burns, or death.
                Always verify de-energized status with an approved meter before touching conductors.
              </li>
              <li>
                <strong>Lockout/Tagout (LOTO):</strong> All energy sources (electrical, refrigerant pressure,
                gas) must be properly locked out and tagged out before performing service work. Follow
                OSHA 29 CFR 1910.147 and applicable employer procedures.
              </li>
              <li>
                <strong>Rotating Equipment:</strong> Blower assemblies, condenser fans, compressors, belts,
                and pulleys can cause crush injuries, lacerations, or entanglement. Never operate equipment
                with guards removed.
              </li>
              <li>
                <strong>Pressurized Refrigerant Systems:</strong> Refrigerant circuits operate under
                significant pressure. Improper handling can cause high-pressure injection injuries, frostbite,
                or asphyxiation. Use only approved refrigerant handling equipment and follow EPA Section 608
                requirements.
              </li>
              <li>
                <strong>Combustion and Gas-Fired Equipment:</strong> Gas furnaces, boilers, and heat strips
                involve combustion risks. Improper service can result in gas leaks, fire, explosion, or
                carbon monoxide (CO) poisoning.
              </li>
              <li>
                <strong>Carbon Monoxide (CO):</strong> Cracked heat exchangers or improper combustion can
                release CO — an odorless, colorless gas that can be fatal. Never service combustion equipment
                without CO detection capability.
              </li>
              <li>
                <strong>Hot Surfaces:</strong> Heat exchangers, flue pipes, electric heat strips, and
                compressor discharge lines operate at high temperatures and can cause severe burns on contact.
              </li>
              <li>
                <strong>Sharp Sheet Metal:</strong> HVAC casings, ductwork, and internal components often
                have sharp edges. Cut-resistant gloves are recommended when working inside units.
              </li>
              <li>
                <strong>Personal Protective Equipment (PPE):</strong> Appropriate PPE must be selected for
                each task — including but not limited to insulated gloves, safety glasses, face shields,
                cut-resistant gloves, and arc flash protection where applicable.
              </li>
              <li>
                <strong>Manufacturer Documentation:</strong> Always consult the specific manufacturer's
                service literature, wiring diagrams, and installation instructions. Generic procedures may
                not apply to all equipment.
              </li>
              <li>
                <strong>Code Compliance:</strong> All service work must comply with applicable local
                mechanical codes, electrical codes (NEC), refrigerant regulations, and authority having
                jurisdiction (AHJ) requirements.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">2. Limitations of UnitDown AI</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                UnitDown AI provides probabilistic, AI-generated diagnostic suggestions. Outputs may be
                incomplete, inaccurate, or not applicable to your specific equipment.
              </li>
              <li>
                The Service does not have access to your equipment's actual condition, age, installation
                specifics, or service history unless you provide those details explicitly.
              </li>
              <li>
                UnitDown AI must never be used as the sole basis for a repair decision. Always verify with
                manufacturer documentation and direct measurement.
              </li>
              <li>
                The Service does not substitute for reading manufacturer wiring diagrams, service bulletins,
                or technical service manuals.
              </li>
              <li>
                Do not use UnitDown AI in emergency situations or where life safety is immediately at risk.
                Contact qualified personnel immediately in those situations.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">3. Your Responsibility</h2>
            <p className="mb-3">By using UnitDown AI, you acknowledge that:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                You are a qualified or supervised individual with appropriate training for HVAC service work,
                or you are using this tool for educational reference only.
              </li>
              <li>
                You are solely responsible for your own safety and the safety of others at the worksite.
              </li>
              <li>
                All actions taken based on UnitDown AI outputs are taken at your own risk and professional
                judgment.
              </li>
              <li>
                UnitDown AI does not create an employer–employee or technician–client relationship. The
                Service is an informational reference tool, not a licensed professional service.
              </li>
            </ul>
          </section>

          <div className="rounded-xl bg-slate-100 border border-slate-200 p-5 text-xs text-slate-500 leading-relaxed">
            This Safety Disclaimer is part of the UnitDown AI{" "}
            <button onClick={() => navigate("/terms")} className="text-blue-600 hover:underline font-semibold">
              Terms of Service
            </button>
            . By using the Service, you agree to all terms and safety acknowledgments stated here. If you
            have questions or concerns, contact{" "}
            <a href="mailto:unitdownsupport@gmail.com" className="text-blue-600 hover:underline font-semibold">
              unitdownsupport@gmail.com
            </a>
            .
          </div>

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
