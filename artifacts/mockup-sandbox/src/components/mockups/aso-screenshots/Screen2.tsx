import React from 'react';
import { ArrowLeft, Send, Sparkles } from 'lucide-react';

export function Screen2() {
  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-black font-sans selection:bg-cyan-500/30">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Section: Marketing Header (~18%) */}
      <div className="h-[18%] flex flex-col items-center justify-end pb-6 z-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center tracking-tight leading-tight text-white drop-shadow-lg">
          HVAC DIAGNOSTICS,<br />
          <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]">ACCELERATED BY AI</span>.
        </h1>
      </div>

      {/* Middle Section: iPhone Mockup (~70%) */}
      <div className="h-[70%] flex items-center justify-center z-10 perspective-[1000px]">
        {/* iPhone 16 Pro Max Frame */}
        <div className="relative w-[340px] h-[720px] bg-gradient-to-b from-slate-700 to-slate-800 rounded-[3.5rem] border border-slate-600/50 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8),inset_0_0_2px_rgba(255,255,255,0.2)] flex-shrink-0">
          
          {/* Side Buttons */}
          <div className="absolute top-[160px] -left-[3px] w-[3px] h-[30px] bg-slate-700 rounded-l-md" /> {/* Silent */}
          <div className="absolute top-[210px] -left-[3px] w-[3px] h-[60px] bg-slate-700 rounded-l-md" /> {/* Vol Up */}
          <div className="absolute top-[280px] -left-[3px] w-[3px] h-[60px] bg-slate-700 rounded-l-md" /> {/* Vol Down */}
          <div className="absolute top-[230px] -right-[3px] w-[3px] h-[90px] bg-slate-700 rounded-r-md" /> {/* Power */}

          {/* Screen Inset */}
          <div className="absolute inset-[6px] bg-slate-950 rounded-[3rem] overflow-hidden flex flex-col shadow-inner">
            
            {/* Dynamic Island */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[120px] h-[32px] bg-black rounded-full z-20 flex items-center justify-between px-3">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800/80 shadow-[inset_0_0_2px_rgba(255,255,255,0.1)]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-blue-900/40"></div>
            </div>

            {/* Simulated UI Content */}
            <div className="flex-1 flex flex-col pt-12 relative h-full">
              {/* Status Bar Fake Space */}
              <div className="absolute top-0 left-0 right-0 h-12 bg-slate-950/80 backdrop-blur-md z-10 flex justify-between px-6 pt-4 text-[10px] font-semibold text-slate-300">
                <span>9:41</span>
                <div className="flex gap-1.5 items-center">
                  <div className="w-4 h-2.5 bg-slate-300 rounded-[2px]" />
                  <div className="w-3.5 h-2.5 bg-slate-300 rounded-[2px]" />
                  <div className="w-5 h-2.5 border border-slate-300 rounded-[3px] p-[1px]"><div className="w-full h-full bg-slate-300 rounded-[1px]" /></div>
                </div>
              </div>

              {/* App Bar */}
              <div className="flex items-center px-4 py-3 border-b border-white/5 bg-slate-950/90 z-10">
                <ArrowLeft className="w-5 h-5 text-cyan-400" />
                <h2 className="ml-3 text-lg font-semibold text-white tracking-wide">Diagnostics</h2>
                <Sparkles className="w-4 h-4 text-cyan-400/70 ml-auto" />
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-hidden px-4 py-4 flex flex-col gap-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMwZjE3MmEiPjwvcmVjdD48cGF0aCBkPSJNMCAwbDRsNCBNMCw0IGw0LC00IiBzdHJva2U9IiMxZTI5M2IiIHN0cm9rZS13aWR0aD0iMC41Ii8+PC9zdmc+')] bg-repeat bg-[length:12px_12px]">
                
                {/* User Message */}
                <div className="self-end max-w-[85%] bg-slate-700 text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-md">
                  <p className="text-sm">Compressor is grounding out on startup</p>
                </div>

                {/* AI Response */}
                <div className="self-start max-w-[95%] bg-white/5 backdrop-blur-sm border border-white/10 text-slate-200 p-4 rounded-2xl rounded-tl-sm shadow-lg relative overflow-hidden group">
                  {/* Left Accent Bar */}
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-600 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                  
                  {/* AI Badge */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="bg-cyan-500/20 text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-500/30 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> AI DIAGNOSIS
                    </span>
                  </div>

                  <p className="text-sm font-medium text-white mb-2 pb-2 border-b border-white/5">
                    Likely Causes — Grounded compressor on startup:
                  </p>
                  
                  <ul className="text-[13px] space-y-2.5 mb-3 leading-snug">
                    <li className="flex items-start gap-2">
                      <span className="opacity-80">⚡</span>
                      <span><strong className="text-white">Compressor winding failure</strong> — check resistance to ground (&lt;1MΩ = failed)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="opacity-80">🔧</span>
                      <span>Check <strong className="text-white">contactor</strong> for arc damage or welded contacts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="opacity-80">📋</span>
                      <span>Measure <strong className="text-white">start capacitor</strong> — shorted cap causes locked rotor</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="opacity-80">💧</span>
                      <span>Check for refrigerant slug or liquid floodback</span>
                    </li>
                  </ul>

                  <div className="mt-3 pt-3 border-t border-white/5 bg-cyan-950/20 -mx-4 -mb-4 p-4">
                    <p className="text-[13px] text-cyan-100">
                      <strong className="text-cyan-400">Action:</strong> Disconnect compressor leads, test each winding to ground with megohmmeter.
                    </p>
                  </div>
                </div>

              </div>

              {/* Bottom Input Area */}
              <div className="p-4 bg-slate-950/95 border-t border-white/10 pb-8 z-10 backdrop-blur-lg">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/50 rounded-full px-4 py-2.5 shadow-inner">
                  <input 
                    type="text" 
                    placeholder="Type your symptom..." 
                    className="bg-transparent flex-1 outline-none text-sm text-white placeholder:text-slate-500"
                    readOnly
                  />
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                    <Send className="w-4 h-4 text-cyan-400 ml-0.5" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Tagline (~12%) */}
      <div className="h-[12%] flex items-center justify-center z-10 pb-4">
        <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <span className="text-white font-bold text-xs">UD</span>
          </div>
          <span className="text-slate-400 text-sm font-medium tracking-wider uppercase">UnitDown AI Professional</span>
        </div>
      </div>
    </div>
  );
}
