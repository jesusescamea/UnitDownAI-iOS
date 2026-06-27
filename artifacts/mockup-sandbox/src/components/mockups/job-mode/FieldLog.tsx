import React from "react";
import {
  Camera,
  Mic,
  Ruler,
  Pencil,
  Wrench,
  Clock,
  Check,
  Zap,
  Image as ImageIcon,
  FileText,
  Activity,
  Flag,
  ChevronLeft,
  MoreVertical,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function FieldLog() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
        
        .font-sans { font-family: 'Inter', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div className="min-h-screen bg-[#F9FAFB] font-sans text-slate-900 flex flex-col items-center">
        <div className="w-full max-w-[390px] bg-white min-h-screen shadow-2xl relative flex flex-col overflow-hidden">
          
          {/* Header */}
          <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 text-slate-500">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-sm font-semibold tracking-tight">JM-2026-0047</h1>
                  <p className="text-xs text-slate-500">Summit Medical Plaza</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-mono font-medium border border-blue-100">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  00:42:17
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-slate-500">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-slate-700">Carrier 50XCQ006</span>
                <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">RTU-3</span>
              </div>
            </div>

            {/* Completeness Tracker */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Required Data</span>
                <span className="text-[11px] font-medium text-slate-700">5/8</span>
              </div>
              <div className="flex gap-1">
                {[
                  { status: 'done', label: 'Photo' },
                  { status: 'done', label: 'Nameplate' },
                  { status: 'done', label: 'Measure 1' },
                  { status: 'done', label: 'Measure 2' },
                  { status: 'done', label: 'Notes' },
                  { status: 'pending', label: 'Diagnosis' },
                  { status: 'pending', label: 'Resolution' },
                  { status: 'pending', label: 'Final Photo' }
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors",
                      item.status === 'done' ? "bg-emerald-500" : "bg-slate-200"
                    )}
                  />
                ))}
              </div>
            </div>
          </header>

          {/* Timeline */}
          <main className="flex-1 overflow-y-auto px-4 py-6 bg-[#FCFDFD] pb-36">
            <div className="relative border-l-2 border-slate-100 ml-4 space-y-6">
              
              {/* Event 1 */}
              <div className="relative pl-6">
                <div className="absolute -left-[13px] top-1 h-6 w-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-600">
                  <Flag className="h-3 w-3" />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-400">08:14</span>
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Job Started</span>
                </div>
              </div>

              {/* Event 2 */}
              <div className="relative pl-6">
                <div className="absolute -left-[13px] top-1 h-6 w-6 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-purple-600">
                  <ImageIcon className="h-3 w-3" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono text-slate-400">08:16</span>
                  <span className="text-xs font-medium text-purple-700">Photo</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                  <p className="text-sm text-slate-700 font-medium">Nameplate captured</p>
                </div>
              </div>

              {/* Event 3 */}
              <div className="relative pl-6">
                <div className="absolute -left-[13px] top-1 h-6 w-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-blue-600">
                  <Mic className="h-3 w-3" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono text-slate-400">08:19</span>
                  <span className="text-xs font-medium text-blue-700">Voice Note</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                  <p className="text-sm text-slate-600 leading-relaxed italic">
                    "Unit short cycling, compressor cutting out on high pressure..."
                  </p>
                </div>
              </div>

              {/* Event 4 */}
              <div className="relative pl-6">
                <div className="absolute -left-[13px] top-1 h-6 w-6 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-amber-600">
                  <Activity className="h-3 w-3" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono text-slate-400">08:23</span>
                  <span className="text-xs font-medium text-amber-700">Measurement</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Supply Air Temp</p>
                    <p className="text-xs text-slate-500 mt-0.5">Expected: 55-60°F</p>
                  </div>
                  <div className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 rounded font-mono text-sm font-semibold">
                    61°F
                  </div>
                </div>
              </div>

              {/* Event 5 */}
              <div className="relative pl-6">
                <div className="absolute -left-[13px] top-1 h-6 w-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-600">
                  <FileText className="h-3 w-3" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono text-slate-400">08:31</span>
                  <span className="text-xs font-medium text-slate-700">Note</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                  <p className="text-sm text-slate-700">Filter visually clogged — original install date unknown.</p>
                </div>
              </div>

              {/* Event 6 */}
              <div className="relative pl-6">
                <div className="absolute -left-[13px] top-1 h-6 w-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-indigo-600">
                  <Wrench className="h-3 w-3" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono text-slate-400">08:35</span>
                  <span className="text-xs font-medium text-indigo-700">Part Installed</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                  <p className="text-sm font-medium text-slate-800">20×20×2 MERV-8 filter</p>
                </div>
              </div>

              {/* Event 7 */}
              <div className="relative pl-6">
                <div className="absolute -left-[13px] top-1 h-6 w-6 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-amber-600">
                  <Activity className="h-3 w-3" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono text-slate-400">08:41</span>
                  <span className="text-xs font-medium text-amber-700">Measurement</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Superheat</p>
                    <p className="text-xs text-slate-500 mt-0.5">Target: 8-12°F</p>
                  </div>
                  <div className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 rounded font-mono text-sm font-semibold">
                    24°F
                  </div>
                </div>
              </div>

              {/* Event 8 */}
              <div className="relative pl-6">
                <div className="absolute -left-[13px] top-1 h-6 w-6 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-purple-600">
                  <ImageIcon className="h-3 w-3" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono text-slate-400">08:42</span>
                  <span className="text-xs font-medium text-purple-700">Photo</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                  <p className="text-sm text-slate-700 font-medium">Condenser coil fouling visible</p>
                </div>
              </div>
              
              <div className="h-10"></div>
            </div>
          </main>

          {/* Bottom Action Tray */}
          <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 px-4 py-4 pb-8 space-y-4">
            
            {/* Quick Actions */}
            <div className="flex justify-between px-2">
              <button className="flex flex-col items-center gap-1.5 group">
                <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center transition-colors group-active:bg-slate-200 border border-slate-200 shadow-sm">
                  <Camera className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium text-slate-500">Photo</span>
              </button>
              
              <button className="flex flex-col items-center gap-1.5 group">
                <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center transition-colors group-active:bg-blue-200 border border-blue-200 shadow-sm">
                  <Mic className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium text-slate-500">Voice</span>
              </button>

              <button className="flex flex-col items-center gap-1.5 group">
                <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center transition-colors group-active:bg-amber-200 border border-amber-200 shadow-sm">
                  <Ruler className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium text-slate-500">Measure</span>
              </button>

              <button className="flex flex-col items-center gap-1.5 group">
                <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center transition-colors group-active:bg-slate-200 border border-slate-200 shadow-sm">
                  <Pencil className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium text-slate-500">Note</span>
              </button>

              <button className="flex flex-col items-center gap-1.5 group">
                <div className="h-12 w-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center transition-colors group-active:bg-indigo-200 border border-indigo-200 shadow-sm">
                  <Wrench className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium text-slate-500">Part</span>
              </button>
            </div>

            {/* Complete Job Button */}
            <Button className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl shadow-md flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Complete Job
            </Button>
            
          </div>
        </div>
      </div>
    </>
  );
}

export default FieldLog;
