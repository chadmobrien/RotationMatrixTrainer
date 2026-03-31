import { useState } from 'react'

const DEG = Math.PI / 180

// ── Common angles dataset ──────────────────────────────────────────────────────

const COMMON_ANGLES = [
  {
    deg: 15, rad: 'π/12',
    cosExact: '(√6+√2)/4', sinExact: '(√6−√2)/4', tanExact: '2−√3',
    color: '#f59e0b',
  },
  {
    deg: 30, rad: 'π/6',
    cosExact: '√3/2', sinExact: '1/2', tanExact: '√3/3',
    color: '#22c55e',
  },
  {
    deg: 45, rad: 'π/4',
    cosExact: '√2/2', sinExact: '√2/2', tanExact: '1',
    color: '#3b82f6',
  },
  {
    deg: 60, rad: 'π/3',
    cosExact: '1/2', sinExact: '√3/2', tanExact: '√3',
    color: '#a78bfa',
  },
  {
    deg: 75, rad: '5π/12',
    cosExact: '(√6−√2)/4', sinExact: '(√6+√2)/4', tanExact: '2+√3',
    color: '#f43f5e',
  },
  {
    deg: 90, rad: 'π/2',
    cosExact: '0', sinExact: '1', tanExact: '∞',
    color: '#22d3ee',
  },
]

function fmt4(x) {
  if (!isFinite(x)) return '∞'
  if (Math.abs(x) < 1e-10) return '0.0000'
  return x.toFixed(4)
}

// ── Unit Circle SVG ────────────────────────────────────────────────────────────

function UnitCircle({ hovered, onHover }) {
  const CX = 200, CY = 205, R = 162
  const W = 440, H = 380

  return (
    <svg width={W} height={H} style={{ display: 'block' }}>

      {/* Globe-style background */}
      <rect width={W} height={H} fill="#060f1a" rx={10} />

      {/* Faint half-radius ring */}
      <circle cx={CX} cy={CY} r={R * 0.5} fill="none" stroke="#1e293b" strokeWidth={1} strokeDasharray="3 2" />

      {/* Full unit circle */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e3a5f" strokeWidth={1.5} />

      {/* Q1 fill — very faint */}
      <path d={`M ${CX} ${CY} L ${CX + R} ${CY} A ${R} ${R} 0 0 0 ${CX} ${CY - R} Z`}
        fill="rgba(59,130,246,0.04)" />

      {/* Axes */}
      <line x1={16} y1={CY} x2={CX + R + 28} y2={CY} stroke="#334155" strokeWidth={1.5} />
      <line x1={CX} y1={CY + R + 24} x2={CX} y2={18} stroke="#334155" strokeWidth={1.5} />

      {/* Axis arrowheads */}
      <polygon points={`${CX + R + 28},${CY} ${CX + R + 20},${CY - 4} ${CX + R + 20},${CY + 4}`} fill="#334155" />
      <polygon points={`${CX},18 ${CX - 4},26 ${CX + 4},26`} fill="#334155" />

      {/* Axis labels */}
      <text x={CX + R + 34} y={CY + 5} fill="#475569" fontSize={12} fontFamily="monospace" fontStyle="italic">x</text>
      <text x={CX + 8} y={14} fill="#475569" fontSize={12} fontFamily="monospace" fontStyle="italic">y</text>

      {/* Tick at (1,0) */}
      <line x1={CX + R} y1={CY - 5} x2={CX + R} y2={CY + 5} stroke="#475569" strokeWidth={1} />
      <text x={CX + R} y={CY + 17} fill="#475569" fontSize={10} fontFamily="monospace" textAnchor="middle">1</text>

      {/* Tick at (0,1) */}
      <line x1={CX - 5} y1={CY - R} x2={CX + 5} y2={CY - R} stroke="#475569" strokeWidth={1} />
      <text x={CX - 10} y={CY - R + 4} fill="#475569" fontSize={10} fontFamily="monospace" textAnchor="end">1</text>

      {/* Origin */}
      <circle cx={CX} cy={CY} r={3} fill="#475569" />
      <text x={CX - 13} y={CY + 15} fill="#475569" fontSize={11} fontFamily="monospace">O</text>

      {/* Per-angle elements */}
      {COMMON_ANGLES.map(({ deg, color }) => {
        const rad = deg * DEG
        const px = CX + R * Math.cos(rad)
        const py = CY - R * Math.sin(rad)
        const isHov = hovered === deg
        const dimmed = hovered !== null && !isHov
        const lineOp  = dimmed ? 0.15 : isHov ? 1.0 : 0.70
        const projOp  = dimmed ? 0.08 : isHov ? 0.80 : 0.28
        const sw = isHov ? 2.8 : 1.8
        const pr = isHov ? 6 : 4

        // Label offset — push outward along the radial direction
        const labelDist = R + 22
        const lx = CX + labelDist * Math.cos(rad)
        const ly = CY - labelDist * Math.sin(rad)
        const anchor = deg >= 80 ? 'middle' : 'start'
        const lyAdj = deg >= 80 ? ly - 4 : ly + 4

        return (
          <g key={deg} style={{ cursor: 'pointer' }}
            onMouseEnter={() => onHover(deg)}
            onMouseLeave={() => onHover(null)}>

            {/* cos projection — vertical drop to x-axis */}
            <line x1={px} y1={py} x2={px} y2={CY}
              stroke={color} strokeWidth={1} strokeDasharray="4 2" opacity={projOp} />
            {/* sin projection — horizontal to y-axis */}
            <line x1={px} y1={py} x2={CX} y2={py}
              stroke={color} strokeWidth={1} strokeDasharray="4 2" opacity={projOp} />

            {/* Dot on x-axis showing cos */}
            <circle cx={px} cy={CY} r={isHov ? 3.5 : 2.5}
              fill={color} opacity={projOp * 1.4} />
            {/* Dot on y-axis showing sin */}
            <circle cx={CX} cy={py} r={isHov ? 3.5 : 2.5}
              fill={color} opacity={projOp * 1.4} />

            {/* Radial line */}
            <line x1={CX} y1={CY} x2={px} y2={py}
              stroke={color} strokeWidth={sw} opacity={lineOp} />

            {/* Angle arc indicator (small arc near origin) */}
            {(() => {
              const arcR = 22
              const endX = CX + arcR * Math.cos(rad)
              const endY = CY - arcR * Math.sin(rad)
              return (
                <path d={`M ${CX + arcR} ${CY} A ${arcR} ${arcR} 0 0 0 ${endX} ${endY}`}
                  fill="none" stroke={color} strokeWidth={1} opacity={lineOp * 0.6} />
              )
            })()}

            {/* Point on circle */}
            <circle cx={px} cy={py} r={pr}
              fill={color} stroke="#060f1a" strokeWidth={1.5} opacity={lineOp} />

            {/* Degree label */}
            <text x={lx} y={lyAdj} fill={color} fontSize={11}
              fontFamily="monospace" fontWeight={700}
              textAnchor={anchor} opacity={lineOp}>
              {deg}°
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Trig value table ───────────────────────────────────────────────────────────

function TrigTable({ hovered, onHover }) {
  const thStyle = {
    padding: '10px 14px', fontSize: 11, fontWeight: 700,
    letterSpacing: 1.2, textTransform: 'uppercase',
    color: '#475569', textAlign: 'center', whiteSpace: 'nowrap',
    borderBottom: '1px solid #1e293b',
  }
  const exactStyle = { fontSize: 13, fontFamily: 'monospace', color: '#cbd5e1', fontWeight: 600 }
  const decStyle   = { fontSize: 11, fontFamily: 'monospace', color: '#475569', marginTop: 3 }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        background: '#0f172a', borderRadius: 10, overflow: 'hidden',
        border: '1px solid #1e293b',
      }}>
        <thead>
          <tr style={{ background: '#1e293b' }}>
            <th style={{ ...thStyle, textAlign: 'left', paddingLeft: 20 }}>θ</th>
            <th style={thStyle}>Radians</th>
            <th style={thStyle}>cos θ</th>
            <th style={thStyle}>sin θ</th>
            <th style={thStyle}>tan θ</th>
          </tr>
        </thead>
        <tbody>
          {COMMON_ANGLES.map(({ deg, rad, cosExact, sinExact, tanExact, color }) => {
            const isHov = hovered === deg
            const cosVal = Math.cos(deg * DEG)
            const sinVal = Math.sin(deg * DEG)
            const tanVal = Math.tan(deg * DEG)
            const rowBg = isHov ? `${color}12` : 'transparent'
            const border = isHov ? `1px solid ${color}44` : '1px solid transparent'

            const cell = (exact, decimal) => (
              <td style={{ padding: '12px 14px', textAlign: 'center', borderBottom: '1px solid #1e293b11' }}>
                <div style={exactStyle}>{exact}</div>
                <div style={decStyle}>{decimal}</div>
              </td>
            )

            return (
              <tr key={deg}
                style={{ background: rowBg, outline: border, cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={() => onHover(deg)}
                onMouseLeave={() => onHover(null)}>
                <td style={{ padding: '12px 20px', borderBottom: '1px solid #1e293b11' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color }}>{deg}°</span>
                  </div>
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center', borderBottom: '1px solid #1e293b11' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#94a3b8' }}>{rad}</span>
                </td>
                {cell(cosExact, fmt4(cosVal))}
                {cell(sinExact, fmt4(sinVal))}
                {cell(tanExact, deg === 90 ? '∞' : fmt4(tanVal))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Interactive angle calculator ───────────────────────────────────────────────

function AngleCalculator() {
  const [angleDeg, setAngleDeg] = useState(45)

  const rad = Number(angleDeg) * DEG
  const cosVal = Math.cos(rad)
  const sinVal = Math.sin(rad)
  const tanVal = Math.tan(rad)
  const tanDisplay = Math.abs(cosVal) < 1e-10 ? '∞' : fmt4(tanVal)

  const inp = {
    background: '#0f172a', border: '1px solid #334155', borderRadius: 8,
    color: '#e2e8f0', fontFamily: 'monospace', fontSize: 16,
    padding: '10px 14px', width: 110, textAlign: 'center',
  }

  const resultCard = (label, value, color) => (
    <div style={{
      background: '#0f172a', borderRadius: 10, padding: '16px 20px',
      border: `1px solid ${color}33`, flex: 1, minWidth: 110, textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color, marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 800, color }}>
        {isNaN(Number(angleDeg)) ? '—' : value}
      </div>
    </div>
  )

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '24px 26px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#475569', marginBottom: 20 }}>
        Angle Calculator
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
            Angle (degrees)
          </div>
          <input
            type="number"
            value={angleDeg}
            onChange={e => setAngleDeg(e.target.value)}
            style={inp}
          />
        </div>
        <div style={{ paddingTop: 22 }}>
          <div style={{ fontSize: 12, color: '#475569', fontFamily: 'monospace' }}>
            = {isNaN(Number(angleDeg)) ? '—' : (Number(angleDeg) * DEG).toFixed(4)} rad
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {resultCard('cos θ', fmt4(cosVal), '#3b82f6')}
        {resultCard('sin θ', fmt4(sinVal), '#22c55e')}
        {resultCard('tan θ', tanDisplay,   '#f59e0b')}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CalculatorsPage() {
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '32px 20px' }}>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: 0, marginBottom: 6 }}>
          Trig Functions
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
          Unit circle, exact values, and an interactive calculator for sin, cos, and tan.
        </p>
      </div>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Unit Circle</h2>
        <span style={{ fontSize: 14, color: '#64748b' }}>Common Angles — First Quadrant</span>
      </div>
      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.75, marginBottom: 24 }}>
        For any angle θ, the point on the unit circle is{' '}
        <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>(cos θ, sin θ)</span>.
        The dashed lines project each point onto the x and y axes, showing the geometric meaning
        of cosine and sine. Hover a row or a radial line to highlight that angle.
      </p>

      {/* Unit circle + table side-by-side */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', marginBottom: 40 }}>

        {/* Circle */}
        <div style={{ background: '#060f1a', borderRadius: 12, border: '1px solid #1e3050', overflow: 'hidden', flexShrink: 0 }}>
          <UnitCircle hovered={hovered} onHover={setHovered} />
          <div style={{ padding: '8px 16px 12px', fontSize: 11, color: '#334155', textAlign: 'center', fontFamily: 'monospace' }}>
            Hover a line to highlight
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, minWidth: 340 }}>
          <TrigTable hovered={hovered} onHover={setHovered} />
          <p style={{ fontSize: 12, color: '#334155', marginTop: 10, lineHeight: 1.7 }}>
            Exact forms shown above each decimal. tan 90° is undefined (the radial line is vertical — it never crosses the x-axis tangent).
          </p>
        </div>

      </div>

      {/* Divider */}
      <div style={{ margin: '0 0 32px', borderTop: '1px solid #1e293b' }} />

      {/* Interactive calculator */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Calculator</h2>
        <span style={{ fontSize: 14, color: '#64748b' }}>Any angle in degrees</span>
      </div>
      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.75, marginBottom: 20 }}>
        Enter any angle to compute its cosine, sine, and tangent, each rounded to 4 decimal places.
        Negative angles and angles beyond 360° are handled correctly.
      </p>
      <AngleCalculator />

    </div>
  )
}
