import React from 'react';
import { ArrowLeft, ChevronDown, CheckCircle2, Activity, Cpu } from 'lucide-react';

export function Screen3() {
  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans text-white relative">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Section (18%) */}
      <div className="h-[18%] flex flex-col items-center justify-end pb-6 z-10">
        <h1 className="text-4xl md:text-5xl font-black text-center leading-tight tracking-tight">
          INSTANT <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">SUPERHEAT<br />& SUBCOOLING</span>
        </h1>
      </div>

      {/* Middle Section: Phone Mockup (70%) */}
      <div className="h-[70%] flex justify-center items-end z-10 pb-4">
        {/* iPhone Outer Frame */}
        <div className="relative w-[320px] h-[650px] bg-gradient-to-b from-slate-700 to-slate-800 rounded-[3rem] p-[6px] border border-slate-600/50 shadow-2xl shadow-cyan-900/20">
          
          {/* Side Buttons */}
          <div className="absolute top-[120px] -left-[2px] w-[3px] h-[25px] bg-slate-700 rounded-l-md" /> {/* Silent */}
          <div className="absolute top-[160px] -left-[2px] w-[3px] h-[45px] bg-slate-700 rounded-l-md" /> {/* Vol Up */}
          <div className="absolute top-[220px] -left-[2px] w-[3px] h-[45px] bg-slate-700 rounded-l-md" /> {/* Vol Down */}
          <div className="absolute top-[180px] -right-[2px] w-[3px] h-[65px] bg-slate-700 rounded-r-md" /> {/* Power */}

          {/* Screen Inset */}
          <div className="relative w-full h-full bg-slate-950 rounded-[2.5rem] overflow-hidden flex flex-col">
            
            {/* Dynamic Island */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-50 flex items-center justify-between px-2">
               <div className="w-2 h-2 bg-slate-800 rounded-full" />
               <div className="w-2 h-2 bg-green-500/20 rounded-full" />
            </div>

            {/* StatusBar (Time/Battery placeholder) */}
            <div className="h-12 w-full pt-3 px-6 flex justify-between items-center text-[10px] font-medium text-slate-300 z-40 bg-slate-950">
              <span>9:41</span>
              <div className="flex gap-1 items-center">
                <Activity size={10} />
                <div className="w-5 h-2.5 border border-slate-400 rounded-[3px] p-[1px]">
                  <div className="w-[80%] h-full bg-slate-300 rounded-[1px]" />
                </div>
              </div>
            </div>

            {/* App UI Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
              
              {/* App Bar */}
              <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5">
                <ArrowLeft className="text-cyan-400" size={24} />
                <h2 className="text-xl font-bold tracking-tight">Calculators</h2>
              </div>

              {/* Tabs */}
              <div className="flex px-4 py-4 gap-4">
                <div className="relative pb-2">
                  <span className="text-cyan-400 font-semibold tracking-wide uppercase text-sm">Superheat</span>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                </div>
                <div className="pb-2">
                  <span className="text-slate-500 font-semibold tracking-wide uppercase text-sm">Subcooling</span>
                </div>
              </div>

              {/* Scrollable Content (Simulated) */}
              <div className="flex-1 px-4 flex flex-col gap-4 pb-6">
                
                {/* Form Group */}
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 shadow-lg flex flex-col gap-4 relative overflow-hidden">
                   {/* Decorative gradient */}
                   <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-2xl rounded-full" />

                   <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5">
                     <span className="text-slate-400 text-sm font-medium">Refrigerant</span>
                     <div className="flex items-center gap-2 text-white font-bold">
                       R-410A <ChevronDown size={16} className="text-cyan-400" />
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                     <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                       <div className="text-slate-400 text-xs font-medium mb-1">Suction Pressure</div>
                       <div className="text-2xl font-bold text-white flex items-end gap-1">
                         118 <span className="text-xs text-slate-500 mb-1">PSI</span>
                       </div>
                       <div className="text-[10px] text-cyan-400 mt-1 font-medium tracking-wide uppercase">
                         Sat. Temp: 40°F
                       </div>
                     </div>
                     <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                       <div className="text-slate-400 text-xs font-medium mb-1">Actual Temp</div>
                       <div className="text-2xl font-bold text-white flex items-end gap-1">
                         55 <span className="text-xs text-slate-500 mb-1">°F</span>
                       </div>
                       <div className="text-[10px] text-slate-500 mt-1 font-medium tracking-wide uppercase">
                         Suction Line
                       </div>
                     </div>
                   </div>

                   <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-1" />

                   <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-cyan-950/20 border border-cyan-500/20 relative overflow-hidden">
                     <div className="absolute inset-0 bg-cyan-500/5 mix-blend-overlay" />
                     <div className="flex items-baseline gap-2 mb-1 z-10">
                       <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Superheat:</span>
                       <span className="text-3xl font-black text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">15°F</span>
                     </div>
                     <div className="flex items-center gap-2 z-10">
                       <span className="text-[10px] text-slate-400 font-medium">TARGET: 10–15°F</span>
                       <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-400/10 px-1.5 py-0.5 rounded-sm">
                         <CheckCircle2 size={10} /> GOOD
                       </span>
                     </div>
                   </div>
                </div>

                {/* Second Row Card - Subcooling */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden opacity-70">
                   <div className="flex justify-between items-center">
                     <span className="text-slate-400 text-sm font-medium">Liquid Pressure</span>
                     <span className="text-white font-bold">385 PSI</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-slate-400 text-sm font-medium">Liquid Temp</span>
                     <span className="text-white font-bold">88°F</span>
                   </div>
                   <div className="h-px w-full bg-white/5 my-1" />
                   <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2">
                       <span className="text-slate-300 font-bold uppercase text-xs">Subcooling:</span>
                       <span className="text-white font-bold">7°F</span>
                     </div>
                     <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                       <CheckCircle2 size={10} /> IN SPEC
                     </span>
                   </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section (12%) */}
      <div className="h-[12%] flex flex-col items-center justify-start z-10">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
          <Cpu className="text-cyan-400" size={16} />
          <span className="text-sm font-medium tracking-wide text-slate-300 uppercase">Field-Tested Precision</span>
        </div>
      </div>

    </div>
  );
}