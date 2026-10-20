/** Mini plano decorativo: muros rayados y tres zonas de color, con los tokens del plano. */
export function PlanArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 240" className={className} aria-hidden="true" focusable="false">
      <defs>
        <pattern id="login-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="var(--plan-grid)" strokeWidth="1" />
        </pattern>
        <pattern id="login-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="var(--plan-ink)" strokeWidth="3" />
        </pattern>
      </defs>
      <rect width="400" height="240" fill="var(--plan-paper)" />
      <rect width="400" height="240" fill="url(#login-grid)" />
      <rect x="40" y="40" width="130" height="90" fill="var(--signal)" fillOpacity="0.25" stroke="var(--signal)" strokeWidth="2" />
      <rect x="190" y="40" width="170" height="60" fill="var(--plan-line)" fillOpacity="0.3" stroke="var(--plan-line)" strokeWidth="2" />
      <rect x="190" y="116" width="80" height="84" fill="var(--plan-ink)" fillOpacity="0.12" stroke="var(--plan-ink)" strokeWidth="2" />
      <path d="M40 150H170M40 150V200" fill="none" stroke="var(--plan-line)" strokeWidth="2" strokeDasharray="6 6" />
      <g fill="url(#login-hatch)">
        <rect x="0" y="0" width="400" height="12" />
        <rect x="0" y="228" width="400" height="12" />
        <rect x="0" y="0" width="12" height="240" />
        <rect x="388" y="0" width="12" height="240" />
      </g>
      <circle cx="105" cy="85" r="5" fill="var(--signal)" />
    </svg>
  );
}
