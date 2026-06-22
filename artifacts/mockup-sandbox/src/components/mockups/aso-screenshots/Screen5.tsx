import React from "react";
import { Check, X, Smartphone, Monitor, Crown } from "lucide-react";

export function Screen5() {
  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-slate-300 font-sans selection:bg-cyan-500/30">
      
      {/* Decorative background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-600/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* TOP SECTION: Marketing Header (~18%) */}
      <div className="h-[18%] flex flex-col items-center justify-end pb-6 px-6 text-center z-10">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase">
          ONE ACCOUNT.<br />
          <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">TOTAL ACCESS.</span>
        </h1>
      </div>

      {/* MIDDLE SECTION: iPhone Mockup (~70%) */}
      <div className="h-[70%] flex items-center justify-center z-10">
        {/* iPhone Outer Shell */}
        <div className="relative w-[320px] h-[650px] bg-gradient-to-b from-slate-700 to-slate-800 rounded-[3rem] p-[6px] shadow-2xl shadow-cyan-900/20 border border-slate-600/50 flex flex-col">
          
          {/* Side Buttons (Simulated) */}
          <div className="absolute top-[120px] -left-[2px] w-[3px] h-[25px] bg-slate-600 rounded-l-sm" /> {/* Silent */}
          <div className="absolute top-[160px] -left-[2px] w-[3px] h-[50px] bg-slate-600 rounded-l-sm" /> {/* Vol Up */}
          <div className="absolute top-[220px] -left-[2px] w-[3px] h-[50px] bg-slate-600 rounded-l-sm" /> {/* Vol Down */}
          <div className="absolute top-[180px] -right-[2px] w-[3px] h-[70px] bg-slate-600 rounded-r-sm" /> {/* Power */}

          {/* Screen Inset */}
          <div className="relative flex-1 bg-slate-950 rounded-[2.6rem] overflow-hidden flex flex-col border border-black">
            
            {/* Dynamic Island */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-30 flex items-center justify-between px-2">
              {/* Minimal camera simulated dots */}
              <div className="w-2 h-2 rounded-full bg-slate-900/50 border border-white/5 ml-auto" />
            </div>

            {/* simulated App UI */}
            <div className="flex-1 flex flex-col pt-12 pb-6 px-5 relative z-10 overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
              
              {/* Internal Glow */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-cyan-500/20 blur-[60px] rounded-full pointer-events-none" />

              {/* App Bar */}
              <div className="flex items-center justify-between mb-8 z-20">
                <span className="text-sm font-bold text-white tracking-wider">Go Pro</span>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <X className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Pro Badge & Headline */}
              <div className="flex flex-col items-center mb-6 z-20">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-cyan-400 blur-xl opacity-40 rounded-full" />
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center border border-cyan-300/30 relative">
                    <Crown className="w-10 h-10 text-white drop-shadow-md" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">UnitDown AI Pro</h2>
                <div className="text-center">
                  <div className="text-3xl font-black text-white">$9.99<span className="text-lg text-slate-400 font-medium">/mo</span></div>
                  <div className="text-xs font-medium text-cyan-400 mt-1">or $79/yr — save 34%</div>
                </div>
              </div>

              {/* Feature Checklist */}
              <div className="flex-1 space-y-3 z-20 px-2">
                {[
                  "Unlimited AI diagnostics",
                  "Full nameplate scanner",
                  "All calculators & tools",
                  "Equipment history & logs",
                  "Mobile app + web access",
                  "Priority support"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                      <Check className="w-3 h-3 text-cyan-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-200">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA & Platform Row */}
              <div className="mt-auto pt-4 z-20">
                <button className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-shadow border border-white/20 mb-4 uppercase tracking-wide">
                  Upgrade to Pro
                </button>
                
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-4 text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-semibold">iOS App</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-slate-600" />
                    <div className="flex items-center gap-1.5">
                      <Monitor className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-semibold">Web Dashboard</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">One subscription, both platforms</div>
                </div>
              </div>

              {/* Home indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Tagline/Badge (~12%) */}
      <div className="h-[12%] flex items-center justify-center pb-4 z-10">
        <div className="flex flex-col items-center gap-2 opacity-80">
          <div className="text-slate-400 text-sm font-semibold tracking-widest uppercase">Professional Grade</div>
          {/* Simulated App Store Badge using simple CSS blocks */}
          <div className="h-10 px-4 bg-black border border-slate-800 rounded-lg flex items-center gap-2">
            <svg viewBox="0 0 384 512" className="w-5 h-5 fill-white"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.3 47.1-.8 81.2-86.3 95.1-125.2-34.3-15.1-54-47.8-54.2-85.4zM245.6 98.4c20.3-24.8 33.6-59.5 29.8-93.6-28.5 1.2-64.9 19.3-86.4 44.5-18 20.5-33.1 56-28.5 89.2 31.8 2.5 64.8-15.3 85.1-40.1z"/></svg>
            <div className="flex flex-col justify-center">
              <span className="text-[9px] leading-none text-white">Download on the</span>
              <span className="text-[14px] leading-none font-semibold text-white mt-[2px]">App Store</span>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
