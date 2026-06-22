import React from "react";
import { 
  Camera, 
  Bot, 
  Calculator, 
  ClipboardList,
  Home,
  Activity,
  Wrench,
  User,
  Zap
} from "lucide-react";

export function Screen4() {
  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-gradient-to-br from-slate-950 to-slate-900 font-sans text-slate-300">
      
      {/* Top section: Marketing header */}
      <div className="h-[18%] flex flex-col items-center justify-end pb-6 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight">
          YOUR MOBILE<br />
          <span className="text-cyan-400">SERVICE ASSISTANT.</span>
        </h1>
      </div>

      {/* Middle section: iPhone 16 Pro Max mockup */}
      <div className="h-[70%] flex justify-center items-center">
        {/* iPhone Outer Shell */}
        <div className="relative w-[340px] h-[720px] bg-gradient-to-b from-slate-700 to-slate-800 rounded-[3rem] p-[6px] shadow-2xl border border-slate-600/50 flex-shrink-0">
          
          {/* Hardware Buttons */}
          <div className="absolute top-[120px] -left-[2px] w-[3px] h-[30px] bg-slate-600 rounded-l-md" /> {/* Silent */}
          <div className="absolute top-[170px] -left-[2px] w-[3px] h-[60px] bg-slate-600 rounded-l-md" /> {/* Vol Up */}
          <div className="absolute top-[240px] -left-[2px] w-[3px] h-[60px] bg-slate-600 rounded-l-md" /> {/* Vol Down */}
          <div className="absolute top-[200px] -right-[2px] w-[3px] h-[90px] bg-slate-600 rounded-r-md" /> {/* Power */}

          {/* Screen Inset */}
          <div className="relative w-full h-full bg-slate-950 rounded-[2.6rem] overflow-hidden flex flex-col">
            
            {/* Dynamic Island */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-50 flex items-center justify-between px-2">
               <div className="w-2 h-2 rounded-full bg-slate-800/80" />
               <div className="w-2 h-2 rounded-full bg-slate-800/80" />
            </div>

            {/* Status Bar spacing */}
            <div className="h-12 w-full shrink-0" />

            {/* App UI */}
            <div className="flex-1 flex flex-col px-4 overflow-hidden">
              
              {/* App Bar */}
              <div className="flex justify-between items-center py-2 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                    <Zap size={18} className="text-cyan-400" />
                  </div>
                  <span className="font-bold text-white tracking-wide">UnitDown AI</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <User size={16} className="text-slate-400" />
                </div>
              </div>

              {/* Welcome */}
              <div className="mt-4 mb-6 shrink-0">
                <h2 className="text-2xl font-bold text-white">Good morning, Tech <span className="text-cyan-400">⚡</span></h2>
              </div>

              {/* Feature Grid */}
              <div className="grid grid-cols-2 gap-3 shrink-0">
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col gap-3 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Camera className="text-cyan-400" size={20} />
                  </div>
                  <span className="font-semibold text-white text-sm">Nameplate Scanner</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col gap-3 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Bot className="text-cyan-400" size={20} />
                  </div>
                  <span className="font-semibold text-white text-sm">AI Diagnostics</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col gap-3 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                    <Calculator className="text-slate-300" size={20} />
                  </div>
                  <span className="font-semibold text-white text-sm">Calculators</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col gap-3 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                    <ClipboardList className="text-slate-300" size={20} />
                  </div>
                  <span className="font-semibold text-white text-sm">Equipment Log</span>
                </div>
              </div>

              {/* Usage Badge */}
              <div className="mt-5 p-4 rounded-xl border border-white/5 bg-slate-900/50 shrink-0">
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-medium text-slate-300">Monthly Usage</span>
                  <span className="text-cyan-400 font-bold">3 / 4 Free</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 w-3/4 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                </div>
              </div>

              {/* Recent Diagnoses */}
              <div className="mt-6 flex-1 min-h-0 flex flex-col">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 shrink-0">Recent Diagnoses</h3>
                <div className="flex flex-col gap-2 overflow-hidden">
                  <div className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 text-sm font-medium text-slate-200 truncate">
                    R-410A Superheat Check
                  </div>
                  <div className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 text-sm font-medium text-slate-200 truncate">
                    Grounding Fault — Compressor
                  </div>
                  <div className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 text-sm font-medium text-slate-200 truncate">
                    Capacitor Test
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Navigation */}
            <div className="h-16 border-t border-white/10 bg-slate-950/80 backdrop-blur-md flex items-center justify-around px-2 shrink-0 pb-2">
              <div className="flex flex-col items-center gap-1 w-16">
                <Home size={20} className="text-cyan-400" />
                <span className="text-[10px] font-medium text-cyan-400">Home</span>
              </div>
              <div className="flex flex-col items-center gap-1 w-16 opacity-50 hover:opacity-100 transition-opacity">
                <Activity size={20} className="text-slate-400" />
                <span className="text-[10px] font-medium text-slate-400">Diagnose</span>
              </div>
              <div className="flex flex-col items-center gap-1 w-16 opacity-50 hover:opacity-100 transition-opacity">
                <Wrench size={20} className="text-slate-400" />
                <span className="text-[10px] font-medium text-slate-400">Tools</span>
              </div>
              <div className="flex flex-col items-center gap-1 w-16 opacity-50 hover:opacity-100 transition-opacity">
                <User size={20} className="text-slate-400" />
                <span className="text-[10px] font-medium text-slate-400">Account</span>
              </div>
            </div>

            {/* Home Indicator */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-600 rounded-full" />
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="h-[12%] flex items-start justify-center pt-4">
        <div className="flex items-center gap-2 opacity-60">
           <Zap size={16} className="text-cyan-400" />
           <span className="text-sm font-bold tracking-widest uppercase">UnitDown AI</span>
        </div>
      </div>
      
    </div>
  );
}
