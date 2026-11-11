export function PlatformArtwork() {
  return (
    <svg className="project-artwork" viewBox="0 0 500 250" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="498" height="248" rx="16" fill="#0c0c0e" stroke="#777570" />
      <path d="M1 30h498M82 30v219" stroke="#55534f" />
      {[16, 29, 42].map((x) => (
        <circle key={x} cx={x} cy="15" r="3" fill="#765cff" />
      ))}
      {[58, 82, 106, 130, 154, 178].map((y, i) => (
        <rect
          key={y}
          x="14"
          y={y}
          width={i === 2 ? 54 : 42}
          height="8"
          rx="4"
          fill={i === 2 ? '#6544ff' : '#565552'}
        />
      ))}
      <rect x="100" y="48" width="245" height="135" rx="12" stroke="#686661" />
      <path
        d="M114 163c32-60 45-16 72-37s35-51 63-30 39-19 64-16 16-11 19-20"
        stroke="#7053ff"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M114 163c32-60 45-16 72-37s35-51 63-30 39-19 64-16 16-11 19-20v112H114z"
        fill="#4521ff"
        opacity=".13"
      />
      <rect x="359" y="48" width="123" height="135" rx="12" stroke="#686661" />
      <circle cx="420" cy="115" r="33" stroke="#363638" strokeWidth="14" />
      <circle
        cx="420"
        cy="115"
        r="33"
        stroke="#6544ff"
        strokeWidth="14"
        strokeDasharray="145 210"
        transform="rotate(-90 420 115)"
      />
      {[100, 230, 359].map((x) => (
        <g key={x} fill="#555552">
          <rect x={x} y="201" width="79" height="7" rx="3.5" />
          <rect x={x} y="219" width="50" height="5" rx="2.5" />
        </g>
      ))}
    </svg>
  )
}

export function SystemArtwork() {
  return (
    <div className="system-artwork" aria-hidden="true">
      <div className="specimen-buttons">
        <span>Primary</span>
        <span>Secondary</span>
        <span>•••</span>
      </div>
      <div className="specimen-controls">
        <span className="specimen-check">✓</span>
        <span className="specimen-box" />
        <span className="specimen-toggle" />
        <span className="specimen-range">
          <i />
        </span>
      </div>
      <div className="specimen-type">
        <span>Aa</span>
        <div>
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="specimen-swatches">
        <i />
        <i />
        <i />
        <i />
        <i />
        <span>↗</span>
      </div>
    </div>
  )
}
