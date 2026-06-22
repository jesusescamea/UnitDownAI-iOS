import React from 'react';
import { Menu, Check, ChevronRight, ScanLine } from 'lucide-react';
import './_group.css';

export function Screen1() {
  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-gradient-to-br from-slate-950 to-slate-900 font-sans text-slate-300">
      {/* Top Section - Header */}
      <div className="h-[18%] flex flex-col items-center justify-end pb-6 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase">
          Scan Nameplates.<br />
          Get <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">Instant Specs</span>.
        </h1>
      </div>

      {/* Middle Section - Phone Mockup */}
      <div className="h-[70%] flex justify-center items-center relative z-10">
         {/* iPhone Shell */}
         <div className="relative w-[320px] h-[680px] bg-gradient-to-b from-slate-700 to-slate-800 rounded-[3rem] p-[6px] shadow-2xl border border-slate-600/50 shadow-cyan-900/20">
            {/* Buttons */}
            <div className="absolute top-[120px] -left-[2px] w-[3px] h-[25px] bg-slate-600 rounded-l-sm" />
            <div className="absolute top-[160px] -left-[2px] w-[3px] h-[50px] bg-slate-600 rounded-l-sm" />
            <div className="absolute top-[220px] -left-[2px] w-[3px] h-[50px] bg-slate-600 rounded-l-sm" />
            <div className="absolute top-[180px] -right-[2px] w-[3px] h-[70px] bg-slate-600 rounded-r-sm" />

            {/* Screen */}
            <div className="relative w-full h-full bg-slate-950 rounded-[2.6rem] overflow-hidden flex flex-col border border-slate-800">
                {/* Dynamic Island */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[100px] h-[26px] bg-black rounded-full z-50" />

                {/* App Bar */}
                <div className="h-20 pt-8 px-5 flex items-center justify-between border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-40">
                  <div className="flex items-center gap-2">
                     <div className="w-6 h-6 rounded bg-cyan-500 flex items-center justify-center text-black font-bold text-xs">U</div>
                     <span className="text-white font-bold tracking-wide">UnitDown AI</span>
                  </div>
                  <Menu className="w-6 h-6 text-slate-400" />
                </div>

                {/* App Content */}
                <div className="flex-1 flex flex-col relative bg-slate-900">
                   {/* Camera Background */}
                   <div className="absolute inset-0 z-0">
                      <img src="/__mockup/images/nameplate-worn.png" alt="Nameplate" className="w-full h-full object-cover opacity-60 blur-[1px]" />
                   </div>

                   {/* Viewfinder overlay */}
                   <div className="relative z-10 flex-1 flex flex-col items-center pt-12 px-6">
                      <div className="w-full aspect-[4/3] relative">
                         {/* Corners */}
                         <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
                         <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
                         <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
                         <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />
                         
                         {/* Clear Center for Image */}
                         <div className="absolute inset-2 overflow-hidden rounded">
                             <img src="/__mockup/images/nameplate-worn.png" alt="Clear Nameplate" className="w-full h-full object-cover scale-110" />
                             {/* Scanline */}
                             <div className="absolute left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_8px_2px_rgba(6,182,212,0.8)] animate-scanline z-20" />
                         </div>
                      </div>
                      
                      <div className="mt-4 flex items-center gap-2 text-cyan-400 text-sm font-medium bg-cyan-950/50 px-3 py-1.5 rounded-full border border-cyan-900/50">
                         <ScanLine className="w-4 h-4 animate-pulse" />
                         Scanning Nameplate...
                      </div>
                   </div>

                   {/* Results Card */}
                   <div className="relative z-20 mx-4 mb-6 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Parsed Results</div>
                      <div className="space-y-2 mb-4">
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Model</span>
                            <span className="text-white font-mono flex items-center gap-1">WC24-30A1-000A <Check className="w-3 h-3 text-cyan-400"/></span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Serial</span>
                            <span className="text-white font-mono flex items-center gap-1">2301234567 <Check className="w-3 h-3 text-cyan-400"/></span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Capacity</span>
                            <span className="text-white font-mono flex items-center gap-1">2.5 Tons <Check className="w-3 h-3 text-cyan-400"/></span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Voltage</span>
                            <span className="text-white font-mono flex items-center gap-1">208-230V <Check className="w-3 h-3 text-cyan-400"/></span>
                         </div>
                      </div>
                      <button className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg flex justify-center items-center gap-2 transition-colors">
                         View Full Specs <ChevronRight className="w-4 h-4" />
                      </button>
                   </div>
                </div>
            </div>
         </div>
      </div>

      {/* Bottom Section - Tagline */}
      <div className="h-[12%] flex items-center justify-center pb-8">
         <div className="flex items-center gap-3 opacity-60">
             <div className="w-8 h-8 rounded-full border border-slate-600 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" xmlns="http://www.w3.org/2000/svg"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.8 3.59-.75 1.58.07 2.76.77 3.57 1.95-3.05 1.83-2.58 5.75.29 6.88-.7 1.68-1.55 3.32-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.37-1.89 4.21-3.74 4.25z"/></svg>
             </div>
             <span className="text-sm font-medium tracking-wide text-slate-400">Available on the App Store</span>
         </div>
      </div>
    </div>
  );
}
