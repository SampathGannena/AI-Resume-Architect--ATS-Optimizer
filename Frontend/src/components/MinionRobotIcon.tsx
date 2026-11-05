import type { SVGProps } from "react";

type MinionRobotIconProps = SVGProps<SVGSVGElement> & {
  animate?: boolean;
};

export default function MinionRobotIcon({ animate = false, className = "", ...props }: MinionRobotIconProps) {
  return (
    <svg
      viewBox="0 0 96 96"
      role="img"
      aria-label="Minion robot icon"
      className={`${animate ? "minion-robot-float" : ""} ${className}`.trim()}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="mr-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd84f" />
          <stop offset="100%" stopColor="#f4b225" />
        </linearGradient>
        <linearGradient id="mr-goggle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8edf5" />
          <stop offset="100%" stopColor="#99a6bb" />
        </linearGradient>
      </defs>

      <g className={animate ? "minion-robot-antenna" : ""}>
        <line x1="48" y1="10" x2="48" y2="20" stroke="#6b7280" strokeWidth="3" strokeLinecap="round" />
        <circle cx="48" cy="8" r="4" fill="#60a5fa" />
      </g>

      <rect x="20" y="18" width="56" height="66" rx="28" fill="url(#mr-body)" stroke="#111827" strokeWidth="2.5" />

      <rect x="18" y="34" width="60" height="20" rx="10" fill="#1f2937" opacity="0.22" />
      <rect x="23" y="31" width="50" height="24" rx="12" fill="#374151" />

      <circle cx="38" cy="43" r="10.5" fill="url(#mr-goggle)" stroke="#111827" strokeWidth="2.5" />
      <circle cx="58" cy="43" r="10.5" fill="url(#mr-goggle)" stroke="#111827" strokeWidth="2.5" />

      <g className={animate ? "minion-robot-eye" : ""}>
        <circle cx="38" cy="43" r="4.6" fill="#111827" />
      </g>
      <g className={animate ? "minion-robot-eye" : ""}>
        <circle cx="58" cy="43" r="4.6" fill="#111827" />
      </g>

      <path d="M36 62c4 4 20 4 24 0" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" />

      <rect x="16" y="48" width="8" height="20" rx="4" fill="#facc15" stroke="#111827" strokeWidth="2" />
      <rect x="72" y="48" width="8" height="20" rx="4" fill="#facc15" stroke="#111827" strokeWidth="2" />

      <rect x="32" y="80" width="10" height="8" rx="3" fill="#1f2937" />
      <rect x="54" y="80" width="10" height="8" rx="3" fill="#1f2937" />
    </svg>
  );
}
