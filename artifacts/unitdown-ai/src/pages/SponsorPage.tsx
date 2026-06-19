import { useState } from "react";
import { Link } from "wouter";
import { ChevronRight, Users, MapPin, BarChart2, Zap, CheckCircle2 } from "lucide-react";
import { useSeoHead } from "@/lib/useSeoHead";

const stats = [
  { icon: Users, label: "Global HVAC Technician Audience" },
  { icon: Zap, label: "Commercial Technician Focused" },
  { icon: BarChart2, label: "Early Growth Placement" },
  { icon: MapPin, label: "Worldwide Reach" },
];

const INQUIRY_TYPES = [
  "Advertising",
  "Tool Partnership",
  "Distributor",
  "Training",
  "Investment",
  "Other",
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SponsorPage() {
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    website: "",
    inquiryType: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useSeoHead({
    title: "Partner With UnitDown AI | Sponsorship",
    description:
      "Partner with UnitDown AI to reach commercial HVAC technicians worldwide. Advertising, tool partnerships, distributor placements, and more.",
    canonical: "https://unitdown.org/sponsor",
    ogType: "website",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.inquiryType) {
      setError("Please select an inquiry type.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/sponsor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-900 transition-colors">
            UnitDown AI
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-700 font-medium">Partner</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">

        {/* Hero */}
        <div className="mb-12 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 leading-tight mb-4">
            Partner With UnitDown AI
          </h1>
          <p className="text-xl text-blue-600 font-semibold mb-4">
            Reach commercial HVAC technicians worldwide.
          </p>
          <p className="text-gray-600 leading-relaxed text-lg">
            We partner with tool brands, distributors, training companies, parts suppliers, and strategic advertisers seeking HVAC technician audiences.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-14">
          {stats.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center text-center gap-2 border border-gray-100 rounded-xl p-4 bg-gray-50"
            >
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                <Icon className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <span className="text-xs font-semibold text-gray-700 leading-snug">{label}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          <div className="bg-slate-900 px-6 py-5">
            <h2 className="text-lg font-bold text-white">Send an Inquiry</h2>
            <p className="text-slate-400 text-sm mt-1">We review every inquiry and reply promptly.</p>
          </div>

          {success ? (
            <div className="px-6 py-14 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Inquiry Received</h3>
              <p className="text-gray-500 max-w-xs">
                Thanks for your interest. We'll reply shortly.
              </p>
              <Link href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors mt-2">
                ← Back to UnitDown AI
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 py-8 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company Name <span className="text-red-500">*</span></label>
                  <input
                    name="companyName"
                    value={form.companyName}
                    onChange={handleChange}
                    required
                    placeholder="Acme Tool Co."
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact Name <span className="text-red-500">*</span></label>
                  <input
                    name="contactName"
                    value={form.contactName}
                    onChange={handleChange}
                    required
                    placeholder="Jane Smith"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="jane@company.com"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+1 555 000 0000"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Website <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    name="website"
                    type="url"
                    value={form.website}
                    onChange={handleChange}
                    placeholder="https://yourcompany.com"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Inquiry Type <span className="text-red-500">*</span></label>
                  <select
                    name="inquiryType"
                    value={form.inquiryType}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
                  >
                    <option value="">Select type…</option>
                    {INQUIRY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message <span className="text-red-500">*</span></label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  placeholder="Tell us about your company, goals, and how you'd like to partner with us…"
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 font-medium">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm px-8 py-3 rounded-xl transition-colors"
              >
                {loading ? "Sending…" : "Send Inquiry"}
              </button>
            </form>
          )}
        </div>

      </main>

      <footer className="border-t border-gray-100 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} UnitDown AI · Commercial HVAC Diagnostics
        </div>
      </footer>
    </div>
  );
}
