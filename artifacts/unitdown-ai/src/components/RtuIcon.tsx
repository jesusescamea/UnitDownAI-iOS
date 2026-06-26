/**
 * Commercial rooftop package unit (RTU) icon.
 * Lucide-compatible: 24×24 viewBox, stroke-based, strokeLinecap/Join round.
 * Use className to control color and size (e.g. w-4 h-4 text-white).
 */
export default function RtuIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Cabinet body */}
      <rect x="2" y="9" width="20" height="11" rx="1.5" />
      {/* Condenser top section */}
      <rect x="2" y="5" width="20" height="5" rx="1.5" />
      {/* Condenser fan (right side of top section) */}
      <circle cx="17" cy="7.5" r="1.6" />
      {/* Evaporator / filter grille lines (left side of body) */}
      <line x1="4.5" y1="12.5" x2="13" y2="12.5" />
      <line x1="4.5" y1="15"   x2="13" y2="15"   />
      <line x1="4.5" y1="17.5" x2="13" y2="17.5" />
      {/* Supply / return duct stubs on right side of body */}
      <line x1="15" y1="12" x2="15" y2="20" strokeWidth="0.75" opacity="0.5" />
      <line x1="18" y1="12" x2="18" y2="20" strokeWidth="0.75" opacity="0.5" />
    </svg>
  );
}
