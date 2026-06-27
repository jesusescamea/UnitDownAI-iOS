import React from "react";
import { Camera, Mic, Activity, FileText, Wrench, Clock, Plus, CheckCircle } from "lucide-react";

export function Command() {
  return (
    <div className="min-h-screen bg-[#070b10] text-slate-200 font-sans w-full max-w-[390px] relative mx-auto overflow-hidden shadow-2xl flex flex-col border border-slate-800">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap');
        .font-mono-tech { font-family: 'Space Mono', monospace; }
        .font-sans-inter { font-family: 'Inter', sans-serif; }
      `}</style>

      {/* Header Bar */}
      <header className="bg-[#0b1219] border-b border-[#1f2937] p-4 flex flex-col gap-3 sticky top-0 z-10 shadow-md">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs font-mono-tech text-[#00e5ff] tracking-widest uppercase mb-1">
              #JM-2026-0047
            </div>
            <h1 className="text-lg font-bold text-white font-sans-inter leading-tight">
              Carrier 50XCQ006 — RTU-3
            </h1>
            <div className="text-sm text-slate-400 font-medium">Summit Medical Plaza</div>
          </div>
          <div className="bg-[#121c26] border border-[#2d3748] px-3 py-1.5 rounded-sm flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#00e5ff]" />
            <span className="font-mono-tech text-[#00e5ff] text-sm font-bold tracking-wider">00:42:17</span>
          </div>
        </div>

        {/* Completeness Tracker */}
        <div className="pt-2 flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-mono-tech text-slate-400">
            <span>TASK COMPLETION</span>
            <span className="text-[#00ffa3]">5 / 8</span>
          </div>
          <div className="flex gap-1 h-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div 
                key={i} 
                className={`flex-1 rounded-sm ${i <= 5 ? 'bg-[#00ffa3]' : 'bg-[#1f2937]'}`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-32">
        <div className="relative border-l-2 border-[#1f2937] ml-3 pl-6 space-y-6 flex flex-col">
          
          {/* Event 1 */}
          <div className="relative">
            <div className="absolute -left-[31px] bg-[#070b10] border-2 border-white rounded-full w-4 h-4 mt-1" />
            <div className="flex flex-col gap-1">
              <span className="font-mono-tech text-xs text-white">08:14</span>
              <div className="bg-white text-black font-bold uppercase text-xs px-3 py-2 rounded-sm inline-block self-start tracking-wider">
                Job Started
              </div>
            </div>
          </div>

          {/* Event 2 */}
          <div className="relative">
            <div className="absolute -left-[31px] bg-[#070b10] border-2 border-[#3b82f6] rounded-full w-4 h-4 mt-1" />
            <div className="flex flex-col gap-1">
              <span className="font-mono-tech text-xs text-[#3b82f6]">08:16</span>
              <div className="bg-[#0f172a] border border-[#1e3a8a] rounded-md p-3">
                <div className="flex items-center gap-2 mb-2 text-[#60a5fa] text-xs font-bold uppercase tracking-wider">
                  <Camera className="w-4 h-4" /> Photo
                </div>
                <div className="text-sm font-medium text-slate-200">Nameplate captured</div>
              </div>
            </div>
          </div>

          {/* Event 3 */}
          <div className="relative">
            <div className="absolute -left-[31px] bg-[#070b10] border-2 border-[#a855f7] rounded-full w-4 h-4 mt-1" />
            <div className="flex flex-col gap-1">
              <span className="font-mono-tech text-xs text-[#a855f7]">08:19</span>
              <div className="bg-[#170f2e] border border-[#3b0764] rounded-md p-3">
                <div className="flex items-center gap-2 mb-2 text-[#c084fc] text-xs font-bold uppercase tracking-wider">
                  <Mic className="w-4 h-4" /> Voice Note
                </div>
                <div className="text-sm italic text-slate-300">
                  "Unit short cycling, compressor cutting out on high pressure..."
                </div>
              </div>
            </div>
          </div>

          {/* Event 4 */}
          <div className="relative">
            <div className="absolute -left-[31px] bg-[#070b10] border-2 border-[#10b981] rounded-full w-4 h-4 mt-1" />
            <div className="flex flex-col gap-1">
              <span className="font-mono-tech text-xs text-[#10b981]">08:23</span>
              <div className="bg-[#022c22] border border-[#065f46] rounded-md p-3">
                <div className="flex items-center gap-2 mb-2 text-[#34d399] text-xs font-bold uppercase tracking-wider">
                  <Activity className="w-4 h-4" /> Measurement
                </div>
                <div className="flex items-baseline gap-3">
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Supply Air</div>
                  <div className="text-2xl font-mono-tech text-white font-bold">61<span className="text-sm text-slate-400 ml-1">°F</span></div>
                </div>
                <div className="text-xs text-[#f59e0b] mt-1 font-mono-tech">EXPECTED: 55-60°F</div>
              </div>
            </div>
          </div>

          {/* Event 5 */}
          <div className="relative">
            <div className="absolute -left-[31px] bg-[#070b10] border-2 border-[#9ca3af] rounded-full w-4 h-4 mt-1" />
            <div className="flex flex-col gap-1">
              <span className="font-mono-tech text-xs text-[#9ca3af]">08:31</span>
              <div className="bg-[#111827] border border-[#374151] rounded-md p-3">
                <div className="flex items-center gap-2 mb-2 text-[#d1d5db] text-xs font-bold uppercase tracking-wider">
                  <FileText className="w-4 h-4" /> Note
                </div>
                <div className="text-sm text-slate-300">
                  Filter visually clogged — original install date unknown
                </div>
              </div>
            </div>
          </div>

          {/* Event 6 */}
          <div className="relative">
            <div className="absolute -left-[31px] bg-[#070b10] border-2 border-[#f97316] rounded-full w-4 h-4 mt-1" />
            <div className="flex flex-col gap-1">
              <span className="font-mono-tech text-xs text-[#f97316]">08:35</span>
              <div className="bg-[#431407] border border-[#7c2d12] rounded-md p-3">
                <div className="flex items-center gap-2 mb-2 text-[#fb923c] text-xs font-bold uppercase tracking-wider">
                  <Wrench className="w-4 h-4" /> Part Installed
                </div>
                <div className="text-sm font-medium text-white">20×20×2 MERV-8 filter</div>
              </div>
            </div>
          </div>

          {/* Event 7 */}
          <div className="relative">
            <div className="absolute -left-[31px] bg-[#070b10] border-2 border-[#10b981] rounded-full w-4 h-4 mt-1" />
            <div className="flex flex-col gap-1">
              <span className="font-mono-tech text-xs text-[#10b981]">08:41</span>
              <div className="bg-[#022c22] border border-[#065f46] rounded-md p-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 bottom-0 w-1 bg-[#ef4444]"></div>
                <div className="flex items-center gap-2 mb-2 text-[#34d399] text-xs font-bold uppercase tracking-wider">
                  <Activity className="w-4 h-4" /> Measurement
                </div>
                <div className="flex items-baseline gap-3">
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Superheat</div>
                  <div className="text-2xl font-mono-tech text-[#ef4444] font-bold">24<span className="text-sm text-slate-400 ml-1">°F</span></div>
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono-tech">TARGET: 8-12°F</div>
              </div>
            </div>
          </div>

          {/* Event 8 */}
          <div className="relative">
            <div className="absolute -left-[31px] bg-[#070b10] border-2 border-[#3b82f6] rounded-full w-4 h-4 mt-1" />
            <div className="flex flex-col gap-1">
              <span className="font-mono-tech text-xs text-[#3b82f6]">08:42</span>
              <div className="bg-[#0f172a] border border-[#1e3a8a] rounded-md p-3">
                <div className="flex items-center gap-2 mb-2 text-[#60a5fa] text-xs font-bold uppercase tracking-wider">
                  <Camera className="w-4 h-4" /> Photo
                </div>
                <div className="text-sm font-medium text-slate-200">Condenser coil fouling visible</div>
              </div>
            </div>
          </div>
          
          <div className="h-4"></div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#070b10] via-[#070b10] to-transparent pt-12 flex flex-col gap-3">
        <button className="bg-[#00e5ff] text-black font-bold font-sans-inter text-sm py-4 px-6 rounded-full flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.3)] active:scale-[0.98] transition-transform">
          <Plus className="w-5 h-5" strokeWidth={3} />
          <span>ADD EVENT</span>
        </button>
        <button className="bg-transparent border border-slate-700 text-slate-300 font-bold font-sans-inter text-sm py-3 px-6 rounded-full flex items-center justify-center gap-2 active:bg-slate-800 transition-colors">
          <CheckCircle className="w-4 h-4" />
          <span>COMPLETE JOB</span>
        </button>
      </div>
    </div>
  );
}
