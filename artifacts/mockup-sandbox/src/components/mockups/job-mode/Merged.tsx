import React, { useState } from "react";
import {
  Camera, Mic, Plus, ChevronLeft, MoreHorizontal, Clock,
  CheckCircle, AlertCircle, Thermometer, Wrench, FileText,
  Package, X, Video, Cpu, PenTool, ImageIcon, Activity,
  Star, Circle, ChevronRight, Zap
} from "lucide-react";

const COLORS = {
  photo:       { border: "#3B82F6", icon: "#2563EB", label: "PHOTO",       iconBg: "#DBEAFE" },
  voice:       { border: "#8B5CF6", icon: "#7C3AED", label: "VOICE NOTE",  iconBg: "#EDE9FE" },
  measurement: { border: "#22C55E", icon: "#16A34A", label: "MEASUREMENT", iconBg: "#DCFCE7" },
  part:        { border: "#F97316", icon: "#EA580C", label: "PART",        iconBg: "#FFEDD5" },
  alarm:       { border: "#EF4444", icon: "#DC2626", label: "ALARM",       iconBg: "#FEE2E2" },
  note:        { border: "#9CA3AF", icon: "#6B7280", label: "NOTE",        iconBg: "#F3F4F6" },
  milestone:   { border: "#1C1917", icon: "#FFFFFF", label: "",            iconBg: "#1C1917" },
};

type EventType = keyof typeof COLORS;

function EventIcon({ type, size = 16 }: { type: EventType; size?: number }) {
  const c = COLORS[type];
  const icons: Record<EventType, React.ReactNode> = {
    photo:       <Camera size={size} />,
    voice:       <Mic size={size} />,
    measurement: <Activity size={size} />,
    part:        <Package size={size} />,
    alarm:       <AlertCircle size={size} />,
    note:        <FileText size={size} />,
    milestone:   <CheckCircle size={size} />,
  };
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 8,
      background: c.iconBg, color: c.icon,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
    }}>
      {icons[type]}
    </div>
  );
}

function OfficeReadyBadge({ level }: { level: "verified" | "captured" | "confidence"; value?: number }) {
  if (level === "verified") return (
    <span style={{ fontSize: 10, color: "#16A34A", background: "#DCFCE7", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>
      ✓ Verified
    </span>
  );
  if (level === "confidence") return (
    <span style={{ fontSize: 10, color: "#7C3AED", background: "#EDE9FE", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>
      92% confidence
    </span>
  );
  return (
    <span style={{ fontSize: 10, color: "#6B7280", background: "#F3F4F6", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>
      Captured
    </span>
  );
}

function MilestoneCard({ time, title, sub }: { time: string; title: string; sub: string }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 16px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 36 }}>
        <span style={{ fontSize: 11, color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>{time}</span>
      </div>
      <div style={{
        flex: 1, background: "#1C1917", borderRadius: 10, padding: "10px 14px",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.05em" }}>{title}</span>
        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

function PhotoCard({ time, title, sub, category }: { time: string; title: string; sub: string; category: string }) {
  const c = COLORS.photo;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 16px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 36, paddingTop: 4 }}>
        <span style={{ fontSize: 11, color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>{time}</span>
      </div>
      <div style={{
        flex: 1, background: "#FFFFFF", borderRadius: 10, borderLeft: `3px solid ${c.border}`,
        padding: "10px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <EventIcon type="photo" />
          <div>
            <div style={{ fontSize: 10, color: c.icon, fontWeight: 700, letterSpacing: "0.05em" }}>
              {c.label} · {category}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", lineHeight: 1.3 }}>{title}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{
            width: 80, height: 56, borderRadius: 8, background: "linear-gradient(135deg, #BFDBFE, #93C5FD)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            <Camera size={20} color="#3B82F6" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.4 }}>{sub}</div>
            <div style={{ marginTop: 6 }}><OfficeReadyBadge level="verified" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VoiceCard({ time, transcript }: { time: string; transcript: string }) {
  const c = COLORS.voice;
  const bars = [4, 7, 3, 9, 5, 11, 6, 4, 8, 5, 3, 7, 9, 4, 2, 6, 8, 5];
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 16px" }}>
      <div style={{ minWidth: 36, paddingTop: 4 }}>
        <span style={{ fontSize: 11, color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>{time}</span>
      </div>
      <div style={{
        flex: 1, background: "#FFFFFF", borderRadius: 10, borderLeft: `3px solid ${c.border}`,
        padding: "10px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <EventIcon type="voice" />
          <span style={{ fontSize: 10, color: c.icon, fontWeight: 700, letterSpacing: "0.05em" }}>{c.label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", background: c.border,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: "#fff" }} />
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 2, height: 24 }}>
            {bars.map((h, i) => (
              <div key={i} style={{
                width: 3, borderRadius: 2,
                height: `${h * 9}%`,
                background: i < 10 ? c.border : "#D1D5DB"
              }} />
            ))}
          </div>
          <span style={{ fontSize: 10, color: "#9CA3AF" }}>0:14</span>
        </div>
        <div style={{
          fontSize: 12, color: "#374151", fontStyle: "italic",
          borderLeft: `2px solid ${c.border}30`, paddingLeft: 8, lineHeight: 1.5
        }}>
          "{transcript}"
        </div>
        <div style={{ marginTop: 6 }}><OfficeReadyBadge level="confidence" /></div>
      </div>
    </div>
  );
}

function MeasurementCard({ time, readings }: {
  time: string;
  readings: { label: string; value: string; sub?: string; ok: boolean }[];
}) {
  const c = COLORS.measurement;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 16px" }}>
      <div style={{ minWidth: 36, paddingTop: 4 }}>
        <span style={{ fontSize: 11, color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>{time}</span>
      </div>
      <div style={{
        flex: 1, background: "#FFFFFF", borderRadius: 10, borderLeft: `3px solid ${c.border}`,
        padding: "10px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <EventIcon type="measurement" />
          <span style={{ fontSize: 10, color: c.icon, fontWeight: 700, letterSpacing: "0.05em" }}>{c.label}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {readings.map((r, i) => (
            <div key={i} style={{
              background: r.ok ? "#F0FDF4" : "#FEF2F2", borderRadius: 8, padding: "6px 10px",
              border: `1px solid ${r.ok ? "#BBF7D0" : "#FECACA"}`
            }}>
              <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 500 }}>{r.label}</div>
              <div style={{
                fontSize: 18, fontWeight: 700, color: r.ok ? "#16A34A" : "#DC2626",
                fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em"
              }}>{r.value}</div>
              {r.sub && <div style={{ fontSize: 10, color: r.ok ? "#16A34A" : "#DC2626" }}>{r.sub}</div>}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 6 }}><OfficeReadyBadge level="verified" /></div>
      </div>
    </div>
  );
}

function NoteCard({ time, title, body }: { time: string; title: string; body: string }) {
  const c = COLORS.note;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 16px" }}>
      <div style={{ minWidth: 36, paddingTop: 4 }}>
        <span style={{ fontSize: 11, color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>{time}</span>
      </div>
      <div style={{
        flex: 1, background: "#FFFFFF", borderRadius: 10, borderLeft: `3px solid ${c.border}`,
        padding: "10px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <EventIcon type="note" />
          <span style={{ fontSize: 10, color: c.icon, fontWeight: 700, letterSpacing: "0.05em" }}>{c.label}</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{body}</div>
      </div>
    </div>
  );
}

function PartCard({ time, name, qty, photo, rec }: { time: string; name: string; qty: string; photo: string; rec: string }) {
  const c = COLORS.part;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 16px" }}>
      <div style={{ minWidth: 36, paddingTop: 4 }}>
        <span style={{ fontSize: 11, color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>{time}</span>
      </div>
      <div style={{
        flex: 1, background: "#FFFFFF", borderRadius: 10, borderLeft: `3px solid ${c.border}`,
        padding: "10px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <EventIcon type="part" />
          <span style={{ fontSize: 10, color: c.icon, fontWeight: 700, letterSpacing: "0.05em" }}>PART INSTALLED</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{
            width: 56, height: 40, borderRadius: 8, background: "#FFEDD5",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            <Package size={18} color={c.icon} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{name}</div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>{qty} · {photo}</div>
          </div>
        </div>
        <div style={{
          marginTop: 8, background: "#FFF7ED", borderRadius: 6, padding: "6px 10px",
          display: "flex", alignItems: "flex-start", gap: 6
        }}>
          <Star size={11} color="#F97316" style={{ marginTop: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: "#9A3412" }}>{rec}</span>
        </div>
        <div style={{ marginTop: 6 }}><OfficeReadyBadge level="verified" /></div>
      </div>
    </div>
  );
}

function AlarmCard({ time, code, title }: { time: string; code: string; title: string }) {
  const c = COLORS.alarm;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 16px" }}>
      <div style={{ minWidth: 36, paddingTop: 4 }}>
        <span style={{ fontSize: 11, color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>{time}</span>
      </div>
      <div style={{
        flex: 1, background: "#FEF2F2", borderRadius: 10, borderLeft: `3px solid ${c.border}`,
        padding: "10px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <EventIcon type="alarm" />
          <div>
            <div style={{ fontSize: 10, color: c.icon, fontWeight: 700, letterSpacing: "0.05em" }}>
              {c.label} · {code}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#7F1D1D" }}>{title}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiSuggestionCard() {
  return (
    <div style={{ margin: "4px 16px 4px 62px" }}>
      <div style={{
        background: "linear-gradient(135deg, #F0F9FF, #E0F2FE)",
        borderRadius: 10, padding: "10px 12px",
        border: "1px solid #BAE6FD"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <div style={{
            width: 18, height: 18, borderRadius: 5, background: "#0284C7",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Cpu size={10} color="#fff" />
          </div>
          <span style={{ fontSize: 10, color: "#0369A1", fontWeight: 700 }}>AI SUGGESTION</span>
        </div>
        <p style={{ fontSize: 12, color: "#0C4A6E", marginBottom: 8, lineHeight: 1.4 }}>
          You installed a belt. Would you like to record:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {["Belt size", "Pulley diameter", "Motor amps"].map((item) => (
            <button key={item} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "#FFFFFF", border: "1px solid #BAE6FD", borderRadius: 6,
              padding: "5px 10px", fontSize: 12, color: "#0369A1", fontWeight: 500,
              cursor: "pointer"
            }}>
              <span>+ {item}</span>
              <span style={{ fontSize: 10, color: "#BAE6FD" }}>Tap</span>
            </button>
          ))}
        </div>
        <button style={{
          marginTop: 6, fontSize: 10, color: "#94A3B8", background: "none",
          border: "none", cursor: "pointer", padding: 0
        }}>Dismiss</button>
      </div>
    </div>
  );
}

function CompletionScore() {
  const pct = 82;
  const missing = ["Nameplate photo", "Repair photo", "Final amp draw", "Customer signature"];
  return (
    <div style={{
      margin: "8px 16px 4px", background: "#FFFFFF", borderRadius: 12,
      padding: "12px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", letterSpacing: "0.04em" }}>
            SERVICE RECORD
          </div>
          <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>Office Ready when complete</div>
        </div>
        <div style={{
          fontSize: 22, fontWeight: 800, color: "#D97706",
          fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em"
        }}>{pct}%</div>
      </div>
      <div style={{ height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: "linear-gradient(90deg, #F59E0B, #D97706)",
          borderRadius: 3, transition: "width 0.3s"
        }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {missing.map((item) => (
          <div key={item} style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 10, color: "#6B7280", background: "#F9FAFB",
            borderRadius: 4, padding: "2px 7px", border: "1px solid #E5E7EB"
          }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, border: "1.5px solid #D1D5DB" }} />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function FabMenu({ onClose }: { onClose: () => void }) {
  const actions = [
    { icon: <Camera size={18} />, label: "Photo",       color: "#2563EB" },
    { icon: <Mic size={18} />,    label: "Voice",       color: "#7C3AED" },
    { icon: <Activity size={18} />,label: "Measurement",color: "#16A34A" },
    { icon: <Package size={18} />,label: "Part",        color: "#EA580C" },
    { icon: <Video size={18} />,  label: "Video",       color: "#0891B2" },
    { icon: <Cpu size={18} />,    label: "AI Assist",   color: "#0369A1" },
    { icon: <FileText size={18} />,label: "Note",       color: "#6B7280" },
    { icon: <PenTool size={18} />,label: "Drawing",     color: "#BE185D" },
  ];
  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(17,24,39,0.6)",
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
      zIndex: 100, backdropFilter: "blur(2px)"
    }} onClick={onClose}>
      <div style={{ padding: "0 20px 100px" }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          background: "#FFFFFF", borderRadius: 20, padding: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
        }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.05em" }}>
              ADD TO TIMELINE
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {actions.map((a) => (
              <button key={a.label} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                background: "none", border: "none", cursor: "pointer", padding: "8px 4px"
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, background: a.color + "15",
                  display: "flex", alignItems: "center", justifyContent: "center", color: a.color
                }}>
                  {a.icon}
                </div>
                <span style={{ fontSize: 10, color: "#374151", fontWeight: 500 }}>{a.label}</span>
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{
            width: "100%", marginTop: 12, padding: "12px", borderRadius: 12,
            background: "#F3F4F6", border: "none", fontSize: 14, fontWeight: 600,
            color: "#374151", cursor: "pointer"
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export function Merged() {
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <div style={{
      minHeight: "100vh", background: "#FAFAF7", position: "relative", overflow: "hidden",
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
      maxWidth: 390, margin: "0 auto"
    }}>

      {/* ── Sticky Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#1C1917", padding: "10px 16px 10px"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ChevronLeft size={20} color="#9CA3AF" />
            <div>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, letterSpacing: "0.08em" }}>
                JOB #JM-2026-0047
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2 }}>
                Carrier 50XCQ006 — RTU-3
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>Summit Medical Plaza</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "#292524", borderRadius: 8, padding: "5px 10px"
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", fontVariantNumeric: "tabular-nums" }}>
                00:42:17
              </span>
            </div>
            <MoreHorizontal size={18} color="#9CA3AF" />
          </div>
        </div>
      </div>

      {/* ── Completion Score ── */}
      <CompletionScore />

      {/* ── Timeline ── */}
      <div style={{ paddingBottom: 100 }}>

        {/* Vertical connector line */}
        <div style={{ position: "relative" }}>

          <MilestoneCard
            time="08:14"
            title="JOB STARTED"
            sub="Arrived on site · Summit Medical Plaza"
          />

          <PhotoCard
            time="08:16"
            title="Nameplate captured"
            sub="Carrier 50XCQ006 · SN: 4321A8876"
            category="Nameplate"
          />

          <AlarmCard
            time="08:18"
            code="Code 82"
            title="High Pressure Cutout — Compressor"
          />

          <VoiceCard
            time="08:19"
            transcript="Unit short cycling, compressor cutting out on high pressure. Condenser coil looks restricted."
          />

          <MeasurementCard
            time="08:23"
            readings={[
              { label: "Supply Air",  value: "61°F",  ok: true,  sub: "Normal" },
              { label: "Return Air",  value: "72°F",  ok: true,  sub: "Normal" },
              { label: "Delta T",     value: "11°F",  ok: false, sub: "Low" },
              { label: "Superheat",   value: "24°F",  ok: false, sub: "↑ High" },
            ]}
          />

          <NoteCard
            time="08:31"
            title="Filter check"
            body="Visually clogged — original install date unknown. No maintenance records on file."
          />

          {/* AI Suggestion inline */}
          <AiSuggestionCard />

          <PartCard
            time="08:35"
            name="20×20×2 MERV-8 Filter"
            qty="Qty 1"
            photo="Photo attached"
            rec="Order 1 additional for truck stock"
          />

          <PhotoCard
            time="08:42"
            title="Condenser coil fouling"
            sub="Restricted airflow — primary suspect"
            category="Failed Part"
          />

          <MeasurementCard
            time="08:48"
            readings={[
              { label: "Motor Amps",  value: "12.4A", ok: true,  sub: "Rated 14A" },
              { label: "Voltage",     value: "208V",  ok: true,  sub: "L1-L2" },
              { label: "Suction",     value: "58 psi",ok: false, sub: "↓ Low" },
              { label: "Head",        value: "385 psi",ok: false, sub: "↑ High" },
            ]}
          />

        </div>
      </div>

      {/* ── FAB Overlay ── */}
      {fabOpen && <FabMenu onClose={() => setFabOpen(false)} />}

      {/* ── Sticky Bottom Bar ── */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 390,
        background: "rgba(250,250,247,0.95)", backdropFilter: "blur(12px)",
        borderTop: "1px solid #E5E7EB", padding: "10px 20px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        zIndex: 50
      }}>
        {/* Camera — always one tap */}
        <button style={{
          width: 48, height: 48, borderRadius: 14, background: "#DBEAFE",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0
        }}>
          <Camera size={20} color="#2563EB" />
        </button>

        {/* Voice — hold to record */}
        <button style={{
          flex: 1, height: 48, borderRadius: 14,
          background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, cursor: "pointer"
        }}>
          <Mic size={18} color="#FFFFFF" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>Hold to Record</span>
        </button>

        {/* FAB */}
        <button
          onClick={() => setFabOpen(true)}
          style={{
            width: 48, height: 48, borderRadius: 14, background: "#111827",
            border: "none", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0
          }}
        >
          <Plus size={22} color="#FFFFFF" />
        </button>
      </div>

    </div>
  );
}
