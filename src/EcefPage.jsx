// ── Projection constants ────────────────────────────────────────────────────────
// Orthographic view: eye at azimuth -30° from X axis, elevation 25°
// Eye direction (unit): (0.785, -0.453, 0.423)
// Screen right  R: ( 0.500,  0.866,  0    )
// Screen up     U: (-0.366,  0.212,  0.906) → negated for SVG y-down
//
// Project world (x,y,z) → screen (sx, sy):
//   sx = CX + SR*(0.500·x + 0.866·y)
//   sy = CY + SR*(0.366·x − 0.212·y − 0.906·z)
//
// Visibility: point on unit sphere is in front hemisphere when
//   0.785·x − 0.453·y + 0.423·z > 0

const DEG = Math.PI / 180

const W = 520, H = 420
const CX = 210, CY = 215   // globe center in SVG
const SR = 125              // sphere radius (px)

const sx = (x, y, z) => CX + SR * ( 0.500 * x + 0.866 * y)
const sy = (x, y, z) => CY + SR * ( 0.366 * x - 0.212 * y - 0.906 * z)
const vis = (x, y, z) =>  0.785 * x - 0.453 * y + 0.423 * z > 0

// ── Curve generators ──────────────────────────────────────────────────────────

function latCircle(latDeg, step = 4) {
  const r = Math.cos(latDeg * DEG), z0 = Math.sin(latDeg * DEG)
  return Array.from({ length: Math.ceil(361 / step) + 1 }, (_, i) => {
    const phi = Math.min(i * step, 360) * DEG
    const x = r * Math.cos(phi), y = r * Math.sin(phi)
    return { sx: sx(x, y, z0), sy: sy(x, y, z0), v: vis(x, y, z0) }
  })
}

function meridian(lonDeg, step = 2) {
  const phi = lonDeg * DEG
  return Array.from({ length: Math.ceil(181 / step) + 1 }, (_, i) => {
    const lam = Math.min(-90 + i * step, 90) * DEG
    const x = Math.cos(lam) * Math.cos(phi)
    const y = Math.cos(lam) * Math.sin(phi)
    const z = Math.sin(lam)
    return { sx: sx(x, y, z), sy: sy(x, y, z), v: vis(x, y, z) }
  })
}

// Split a point array into consecutive front/back segments
function segments(pts) {
  const segs = []
  let cur = null
  for (const p of pts) {
    if (!cur || cur.v !== p.v) { if (cur) segs.push(cur); cur = { v: p.v, pts: [] } }
    cur.pts.push(p)
  }
  if (cur) segs.push(cur)
  return segs
}

const toStr = pts => pts.map(p => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(' ')

// ── Pre-computed static wireframe ─────────────────────────────────────────────

const WF = {
  lats:    [-60, -30, 30, 60].map(l => segments(latCircle(l))),
  mers:    [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(l => segments(meridian(l))),
  equator: segments(latCircle(0, 2)),
  prime:   segments(meridian(0, 2)),
}

// ── SVG helpers ───────────────────────────────────────────────────────────────

function GlobeCurve({ segs, frontStroke, frontWidth = 0.8, frontOpacity = 0.65 }) {
  return (
    <>
      {segs.map((s, i) => (
        <polyline key={i} points={toStr(s.pts)} fill="none"
          stroke={s.v ? frontStroke : '#1a2e4a'}
          strokeWidth={s.v ? frontWidth : 0.5}
          strokeDasharray={s.v ? '' : '3 2'}
          opacity={s.v ? frontOpacity : 0.3}
        />
      ))}
    </>
  )
}

function Arrow3D({ from3, to3, color, label, lx, ly }) {
  const x0 = sx(...from3), y0 = sy(...from3)
  const x1 = sx(...to3),   y1 = sy(...to3)
  const dx = x1 - x0, dy = y1 - y0
  const len = Math.hypot(dx, dy)
  const ux = dx / len, uy = dy / len
  const hw = 6, hl = 13
  const bx = x1 - ux * hl, by = y1 - uy * hl
  const px = -uy, py = ux
  return (
    <g>
      <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={color} strokeWidth={2.2} />
      <polygon
        points={`${x1},${y1} ${bx + px*hw/2},${by + py*hw/2} ${bx - px*hw/2},${by - py*hw/2}`}
        fill={color}
      />
      {label && (
        <text x={lx ?? x1 + 10} y={ly ?? y1 + 4}
          fill={color} fontSize={15} fontWeight={800} fontFamily="monospace">
          {label}
        </text>
      )}
    </g>
  )
}

// Small annotation: dot on sphere surface + label with leader
function SphereLabel({ world, text, dx = 14, dy = 0, color = '#94a3b8' }) {
  const x = sx(...world), y = sy(...world)
  return (
    <g>
      <circle cx={x} cy={y} r={3} fill={color} />
      <line x1={x} y1={y} x2={x + dx * 0.6} y2={y + dy * 0.6}
        stroke={color} strokeWidth={1} opacity={0.5} />
      <text x={x + dx} y={y + dy + 4} fill={color} fontSize={11}
        fontFamily="monospace" fontWeight={600}
        textAnchor={dx < 0 ? 'end' : 'start'}>
        {text}
      </text>
    </g>
  )
}

// ── The globe SVG ─────────────────────────────────────────────────────────────

function GlobeSVG() {
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <defs>
        <radialGradient id="sphereGrad" cx="38%" cy="35%" r="60%">
          <stop offset="0%"   stopColor="#0e2a45" />
          <stop offset="60%"  stopColor="#071525" />
          <stop offset="100%" stopColor="#030b14" />
        </radialGradient>
        <clipPath id="sphereClip">
          <circle cx={CX} cy={CY} r={SR} />
        </clipPath>
      </defs>

      {/* Sphere fill */}
      <circle cx={CX} cy={CY} r={SR} fill="url(#sphereGrad)" />

      {/* Back hemisphere grid */}
      {WF.lats.map((segs, i) => <GlobeCurve key={`lat-${i}`} segs={segs} frontStroke="#2d5a7a" frontWidth={0.7} frontOpacity={0.55} />)}
      {WF.mers.map((segs, i) => <GlobeCurve key={`mer-${i}`} segs={segs} frontStroke="#2d5a7a" frontWidth={0.7} frontOpacity={0.55} />)}

      {/* Equator — amber, emphasized */}
      <GlobeCurve segs={WF.equator} frontStroke="#f59e0b" frontWidth={1.8} frontOpacity={0.9} />

      {/* Prime meridian — lighter, emphasized */}
      <GlobeCurve segs={WF.prime} frontStroke="#cbd5e1" frontWidth={1.6} frontOpacity={0.85} />

      {/* Sphere outline */}
      <circle cx={CX} cy={CY} r={SR} fill="none" stroke="#2d5a7a" strokeWidth={1} />

      {/* ── Annotation labels ── */}
      {/* North Pole dot on sphere */}
      <SphereLabel world={[0, 0, 1]} text="North Pole" dx={14} dy={-6} color="#94a3b8" />

      {/* Equator label — at a visible point ~50° longitude */}
      <SphereLabel
        world={[Math.cos(50*DEG), Math.sin(50*DEG), 0]}
        text="Equator" dx={12} dy={8} color="#f59e0b"
      />

      {/* Prime meridian label — on the meridian, upper visible arc */}
      <SphereLabel world={[Math.cos(40*DEG), 0, Math.sin(40*DEG)]}
        text="Prime Meridian" dx={12} dy={2} color="#cbd5e1"
      />

      {/* ── Axis arrows — drawn last (on top) ── */}
      {/* X axis (red): through equator/prime meridian intersection */}
      <Arrow3D from3={[-0.2, 0, 0]} to3={[1.5, 0, 0]} color="#ef4444" label="X"
        lx={sx(1.5, 0, 0) + 8} ly={sy(1.5, 0, 0) + 5} />

      {/* Y axis (green): 90° east along equator */}
      <Arrow3D from3={[0, -0.2, 0]} to3={[0, 1.5, 0]} color="#22c55e" label="Y"
        lx={sx(0, 1.5, 0) + 8} ly={sy(0, 1.5, 0) + 4} />

      {/* Z axis (blue): through north pole */}
      <Arrow3D from3={[0, 0, -0.25]} to3={[0, 0, 1.45]} color="#60a5fa" label="Z"
        lx={sx(0, 0, 1.45) + 8} ly={sy(0, 0, 1.45)} />
    </svg>
  )
}

// ── Axis info cards ───────────────────────────────────────────────────────────

const AXIS_INFO = [
  {
    label: 'X', color: '#ef4444', bg: '#7f1d1d22',
    title: 'Equator × Prime Meridian',
    body: 'Points outward through the intersection of the equatorial plane and the Prime Meridian (0° latitude, 0° longitude). On Earth\'s surface this is in the Gulf of Guinea, off the west coast of Africa.',
  },
  {
    label: 'Y', color: '#22c55e', bg: '#14532d22',
    title: '90° East on the Equator',
    body: 'Perpendicular to X, also in the equatorial plane, pointing toward 0° latitude, 90° East longitude — in the Indian Ocean. Y completes the right-handed coordinate triad with X and Z.',
  },
  {
    label: 'Z', color: '#60a5fa', bg: '#1e3a5f44',
    title: 'North Pole / Spin Axis',
    body: 'Aligned with Earth\'s mean rotation axis, pointing toward the North Pole (Celestial Intermediate Pole). Z is perpendicular to the equatorial plane and defines the "up" direction in ECEF.',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EcefPage() {
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>ECEF</h2>
          <span style={{ fontSize: 15, color: '#64748b' }}>Earth-Centered, Earth-Fixed</span>
        </div>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, maxWidth: 620, marginTop: 10 }}>
          A Cartesian frame whose origin sits at Earth's center of mass, whose axes are fixed
          to Earth and rotate with it. Positions anywhere on or near Earth can be expressed
          as a single (X, Y, Z) triple — no latitude/longitude conversion needed for vector math.
        </p>
      </div>

      {/* Diagram + axis cards side by side on wide screens */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start', marginBottom: 28 }}>

        {/* Globe */}
        <div style={{
          background: '#060f1a', borderRadius: 12, border: '1px solid #1e3050',
          overflow: 'hidden', flexShrink: 0
        }}>
          <GlobeSVG />
          <div style={{ display: 'flex', gap: 20, padding: '8px 16px 12px', justifyContent: 'center', fontSize: 12 }}>
            <span style={{ color: '#ef4444' }}>■ X axis</span>
            <span style={{ color: '#22c55e' }}>■ Y axis</span>
            <span style={{ color: '#60a5fa' }}>■ Z axis</span>
            <span style={{ color: '#f59e0b' }}>— Equator</span>
            <span style={{ color: '#cbd5e1' }}>— Prime Meridian</span>
          </div>
        </div>

        {/* Axis cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 260 }}>
          {AXIS_INFO.map(ax => (
            <div key={ax.label} style={{
              background: ax.bg, border: `1px solid ${ax.color}44`,
              borderLeft: `3px solid ${ax.color}`,
              borderRadius: 10, padding: '14px 16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{
                  fontFamily: 'monospace', fontWeight: 800, fontSize: 16,
                  color: ax.color, width: 20
                }}>{ax.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1' }}>{ax.title}</span>
              </div>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>{ax.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Key properties */}
      <div style={{ background: '#1e293b', borderRadius: 10, padding: '18px 20px', border: '1px solid #334155' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#475569', marginBottom: 14 }}>
          Key Properties
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {[
            { label: 'Origin', val: "Earth's center of mass" },
            { label: 'Handedness', val: 'Right-handed (X × Y = Z)' },
            { label: 'Rotates with', val: 'Earth (sidereal rotation)' },
            { label: 'Units', val: 'Meters (SI)' },
            { label: 'Epoch', val: 'Fixed to WGS-84 ellipsoid' },
            { label: 'Common use', val: 'GPS, satellite orbits, geodesy' },
          ].map(({ label, val }) => (
            <div key={label} style={{ minWidth: 180 }}>
              <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#cbd5e1' }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
