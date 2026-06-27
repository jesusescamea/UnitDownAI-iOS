import React from "react";
import { 
  Camera, 
  Mic, 
  Thermometer, 
  FileText, 
  Wrench, 
  Plus,
  CheckCircle2,
  Clock,
  ArrowRight,
  MoreVertical,
  MapPin,
  ChevronLeft
} from "lucide-react";

export default function Notebook() {
  return (
    <div className="min-h-screen w-full max-w-[390px] mx-auto bg-[#f8f5f0] text-[#2c3e50] relative overflow-hidden font-sans pb-32 shadow-xl ring-1 ring-black/5" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&family=Inter:wght@400;500;600;700&display=swap');
        
        .paper-texture {
          background-image: 
            linear-gradient(#e5e0d8 1px, transparent 1px);
          background-size: 100% 28px;
          background-position: 0 14px;
        }

        .ink-stamp {
          font-family: 'Courier Prime', monospace;
          color: #5c6c75;
          letter-spacing: -0.5px;
        }

        .journal-font {
          font-family: 'Inter', sans-serif;
        }

        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Header */}
      <header className="bg-[#f0ece1] border-b border-[#d8d2c4] px-4 py-4 sticky top-0 z-20 shadow-sm">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <button className="text-[#5c6c75] p-1 -ml-1 hover:bg-[#e5e0d8] rounded-md transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-xs font-bold tracking-wider text-[#8b6b4a] uppercase">Job #JM-2026-0047</h1>
              <h2 className="text-sm font-semibold mt-0.5">Summit Medical Plaza</h2>
            </div>
          </div>
          <button className="text-[#5c6c75] p-1">
            <MoreVertical size={20} />
          </button>
        </div>

        <div className="bg-white/60 rounded-lg p-3 border border-[#e5e0d8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#e67e22]/10 text-[#e67e22] rounded-md flex items-center justify-center border border-[#e67e22]/20">
              <Wrench size={20} />
            </div>
            <div>
              <p className="text-xs text-[#5c6c75] font-medium">Carrier 50XCQ006</p>
              <p className="text-sm font-bold">RTU-3</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-[#e67e22] bg-[#e67e22]/10 px-2 py-1 rounded text-xs font-bold">
              <Clock size={12} />
              <span className="ink-stamp text-[#e67e22]">00:42:17</span>
            </div>
          </div>
        </div>

        {/* Task completeness */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex -space-x-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-4 h-4 rounded-full bg-[#4caf50] border-2 border-[#f0ece1] flex items-center justify-center">
                <CheckCircle2 size={10} className="text-white" />
              </div>
            ))}
            {[6, 7, 8].map((i) => (
              <div key={i} className="w-4 h-4 rounded-full bg-[#d8d2c4] border-2 border-[#f0ece1]" />
            ))}
          </div>
          <span className="text-xs font-medium text-[#5c6c75] ml-1">5 of 8 tasks complete</span>
        </div>
      </header>

      {/* Timeline */}
      <main className="paper-texture min-h-screen px-4 pt-6 pb-40">
        <div className="relative pl-14 space-y-6">
          {/* Vertical timeline line */}
          <div className="absolute left-[38px] top-2 bottom-0 w-px bg-[#d8d2c4] z-0"></div>

          {/* Event 1: Start */}
          <div className="relative z-10">
            <div className="absolute -left-14 top-1 ink-stamp text-xs font-bold">08:14</div>
            <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-[#8b6b4a] border-2 border-[#f8f5f0]"></div>
            <div className="bg-[#8b6b4a] text-[#f8f5f0] p-3 rounded-lg shadow-sm border border-[#765839]">
              <h3 className="text-sm font-bold tracking-widest uppercase">Job Started</h3>
              <p className="text-xs opacity-80 mt-1">Technician arrived on site</p>
            </div>
          </div>

          {/* Event 2: Photo */}
          <div className="relative z-10">
            <div className="absolute -left-14 top-1 ink-stamp text-xs">08:16</div>
            <div className="absolute -left-[19px] top-2 w-2 h-2 rounded-full bg-[#d8d2c4] border border-[#f8f5f0]"></div>
            <div className="bg-white/80 p-3 rounded-lg border border-[#e5e0d8] shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-[#5c6c75]">
                <Camera size={14} />
                <span className="text-xs font-semibold uppercase tracking-wider">Photo</span>
              </div>
              <div className="flex gap-3">
                <div className="w-16 h-16 bg-[#d8d2c4] rounded flex items-center justify-center border border-[#ccc]">
                  <span className="text-[10px] text-[#888]">Img</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Nameplate captured</p>
                  <p className="text-xs text-[#5c6c75] mt-1">SN: 4321A8876</p>
                </div>
              </div>
            </div>
          </div>

          {/* Event 3: Voice */}
          <div className="relative z-10">
            <div className="absolute -left-14 top-1 ink-stamp text-xs">08:19</div>
            <div className="absolute -left-[19px] top-2 w-2 h-2 rounded-full bg-[#d8d2c4] border border-[#f8f5f0]"></div>
            <div className="bg-white/80 p-3 rounded-lg border border-[#e5e0d8] shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-[#e67e22]">
                <Mic size={14} />
                <span className="text-xs font-semibold uppercase tracking-wider">Voice Note</span>
              </div>
              <div className="bg-[#f8f5f0] p-2 rounded flex items-center gap-2 mb-2 border border-[#e5e0d8]">
                <div className="w-6 h-6 rounded-full bg-[#e67e22] text-white flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 bg-white rounded-sm" />
                </div>
                <div className="flex-1 flex gap-0.5 items-center h-4">
                  {[4, 7, 3, 8, 5, 10, 6, 4, 8, 5, 3, 6, 8, 4, 2].map((h, i) => (
                    <div key={i} className="w-1 bg-[#e67e22]/50 rounded-full" style={{ height: `${h * 10}%` }} />
                  ))}
                </div>
                <span className="text-[10px] font-medium text-[#5c6c75]">0:14</span>
              </div>
              <p className="text-sm italic text-[#5c6c75] border-l-2 border-[#e67e22]/30 pl-2">
                "Unit short cycling, compressor cutting out on high pressure..."
              </p>
            </div>
          </div>

          {/* Event 4: Measurement */}
          <div className="relative z-10">
            <div className="absolute -left-14 top-1 ink-stamp text-xs">08:23</div>
            <div className="absolute -left-[19px] top-2 w-2 h-2 rounded-full bg-[#d8d2c4] border border-[#f8f5f0]"></div>
            <div className="bg-[#e8f4f8] p-3 rounded-lg border border-[#b8e0ed] shadow-sm">
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2 text-[#2980b9]">
                  <Thermometer size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Measurement</span>
                </div>
                <div className="bg-white text-[#2980b9] px-2 py-0.5 rounded text-lg font-bold border border-[#b8e0ed] shadow-sm">
                  61°F
                </div>
              </div>
              <p className="text-sm font-medium text-[#2c3e50]">Supply air temp</p>
              <p className="text-xs text-[#5c6c75] mt-1 bg-white/50 inline-block px-1.5 py-0.5 rounded">
                Expected: 55-60°F
              </p>
            </div>
          </div>

          {/* Event 5: Note */}
          <div className="relative z-10">
            <div className="absolute -left-14 top-1 ink-stamp text-xs">08:31</div>
            <div className="absolute -left-[19px] top-2 w-2 h-2 rounded-full bg-[#d8d2c4] border border-[#f8f5f0]"></div>
            <div className="bg-[#fff9e6] p-3 rounded-lg border border-[#f5e3a9] shadow-sm">
              <div className="flex items-center gap-2 mb-1 text-[#f39c12]">
                <FileText size={14} />
                <span className="text-xs font-semibold uppercase tracking-wider">Note</span>
              </div>
              <p className="text-sm text-[#2c3e50] leading-relaxed">
                Filter visually clogged — original install date unknown.
              </p>
            </div>
          </div>

          {/* Event 6: Part */}
          <div className="relative z-10">
            <div className="absolute -left-14 top-1 ink-stamp text-xs">08:35</div>
            <div className="absolute -left-[19px] top-2 w-2 h-2 rounded-full bg-[#d8d2c4] border border-[#f8f5f0]"></div>
            <div className="bg-white/80 p-3 rounded-lg border border-[#e5e0d8] shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1 text-[#4caf50]">
                  <CheckCircle2 size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Part Installed</span>
                </div>
                <p className="text-sm font-bold text-[#2c3e50]">20×20×2 MERV-8 filter</p>
                <p className="text-xs text-[#5c6c75]">Qty: 1</p>
              </div>
              <div className="w-8 h-8 rounded bg-[#f0ece1] flex items-center justify-center text-[#5c6c75]">
                <Wrench size={14} />
              </div>
            </div>
          </div>

          {/* Event 7: Measurement (High Alert) */}
          <div className="relative z-10">
            <div className="absolute -left-14 top-1 ink-stamp text-xs">08:41</div>
            <div className="absolute -left-[19px] top-2 w-2 h-2 rounded-full bg-[#e74c3c] border border-[#f8f5f0]"></div>
            <div className="bg-[#fceae8] p-3 rounded-lg border border-[#f1b4ad] shadow-sm">
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2 text-[#c0392b]">
                  <Thermometer size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Measurement</span>
                </div>
                <div className="bg-white text-[#c0392b] px-2 py-0.5 rounded text-lg font-bold border border-[#f1b4ad] shadow-sm flex items-center gap-1">
                  24°F <span className="text-xs bg-[#c0392b] text-white px-1 py-0.5 rounded uppercase tracking-wider">High</span>
                </div>
              </div>
              <p className="text-sm font-medium text-[#2c3e50]">Superheat</p>
              <p className="text-xs text-[#c0392b] mt-1 bg-white/50 inline-block px-1.5 py-0.5 rounded">
                Target: 8-12°F
              </p>
            </div>
          </div>

          {/* Event 8: Photo */}
          <div className="relative z-10">
            <div className="absolute -left-14 top-1 ink-stamp text-xs">08:42</div>
            <div className="absolute -left-[19px] top-2 w-2 h-2 rounded-full bg-[#d8d2c4] border border-[#f8f5f0]"></div>
            <div className="bg-white/80 p-3 rounded-lg border border-[#e5e0d8] shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-[#5c6c75]">
                <Camera size={14} />
                <span className="text-xs font-semibold uppercase tracking-wider">Photo</span>
              </div>
              <div className="flex gap-3">
                <div className="w-16 h-16 bg-[#d8d2c4] rounded flex items-center justify-center border border-[#ccc]">
                  <span className="text-[10px] text-[#888]">Img</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Condenser coil</p>
                  <p className="text-xs text-[#5c6c75] mt-1">Fouling visible</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="h-20"></div>
        </div>
      </main>

      {/* Floating Action Menu Area */}
      <div className="fixed bottom-0 w-full max-w-[390px] bg-gradient-to-t from-[#f8f5f0] via-[#f8f5f0] to-transparent pt-12 pb-6 px-4 z-30">
        
        {/* Quick Add Pills */}
        <div className="flex justify-center gap-2 mb-4 overflow-x-auto hide-scrollbar">
          <button className="flex items-center gap-1.5 bg-white border border-[#e5e0d8] shadow-sm px-3 py-2 rounded-full text-xs font-semibold text-[#5c6c75] hover:bg-[#f0ece1]">
            <Camera size={14} /> Photo
          </button>
          <button className="flex items-center gap-1.5 bg-white border border-[#e5e0d8] shadow-sm px-3 py-2 rounded-full text-xs font-semibold text-[#5c6c75] hover:bg-[#f0ece1]">
            <Thermometer size={14} /> Measure
          </button>
          <button className="flex items-center gap-1.5 bg-white border border-[#e5e0d8] shadow-sm px-3 py-2 rounded-full text-xs font-semibold text-[#5c6c75] hover:bg-[#f0ece1]">
            <FileText size={14} /> Note
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Main FAB */}
          <button className="w-14 h-14 bg-[#e67e22] text-white rounded-full shadow-lg flex items-center justify-center flex-shrink-0 hover:bg-[#d35400] transition-colors border-2 border-[#f8f5f0]">
            <Mic size={24} />
          </button>

          {/* Complete Job Button */}
          <button className="flex-1 bg-[#2c3e50] text-white rounded-xl h-14 font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-[#1a252f] transition-colors">
            Complete Job <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
