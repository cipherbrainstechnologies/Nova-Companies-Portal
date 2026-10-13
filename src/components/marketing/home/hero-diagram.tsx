export function HeroDiagram() {
  return (
    <svg
      viewBox="0 0 480 320"
      role="img"
      aria-labelledby="eor-diagram-title eor-diagram-desc"
      className="h-auto w-full max-w-md"
    >
      <title id="eor-diagram-title">Employment arrangement overview</title>
      <desc id="eor-diagram-desc">
        Your business directs day-to-day work. A Nova employment partner handles local employment administration. Your
        team member is employed in India under the agreed arrangement.
      </desc>
      <defs>
        <linearGradient id="mkt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6254D9" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#17233B" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="464" height="304" rx="20" fill="url(#mkt-grad)" stroke="#E6E8F0" />
      <g fontFamily="system-ui, sans-serif" fontSize="13" fill="#17233B">
        <rect x="32" y="120" width="120" height="72" rx="14" fill="#fff" stroke="#E6E8F0" />
        <text x="92" y="152" textAnchor="middle" fontWeight="600">Your business</text>
        <text x="92" y="172" textAnchor="middle" fill="#657187" fontSize="11">Day-to-day direction</text>

        <rect x="180" y="100" width="120" height="112" rx="14" fill="#F1EFFF" stroke="#6254D9" strokeWidth="1.5" />
        <text x="240" y="148" textAnchor="middle" fontWeight="600">Nova employment</text>
        <text x="240" y="164" textAnchor="middle" fontWeight="600">partner</text>
        <text x="240" y="188" textAnchor="middle" fill="#657187" fontSize="11">Local employment</text>
        <text x="240" y="202" textAnchor="middle" fill="#657187" fontSize="11">administration</text>

        <rect x="328" y="120" width="120" height="72" rx="14" fill="#fff" stroke="#E6E8F0" />
        <text x="388" y="152" textAnchor="middle" fontWeight="600">Your India team</text>
        <text x="388" y="172" textAnchor="middle" fill="#657187" fontSize="11">Employed locally</text>
      </g>
      <path d="M152 156 H180" stroke="#6254D9" strokeWidth="2" markerEnd="url(#arrow)" />
      <path d="M300 156 H328" stroke="#6254D9" strokeWidth="2" markerEnd="url(#arrow)" />
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#6254D9" />
        </marker>
      </defs>
      <text x="240" y="48" textAnchor="middle" fill="#657187" fontSize="11" fontFamily="system-ui, sans-serif">
        Illustrative model — contracting entity named in your agreement
      </text>
    </svg>
  );
}
