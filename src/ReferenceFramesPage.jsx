import { useState } from 'react'

// ── Shared projection ──────────────────────────────────────────────────────────
// Orthographic view: eye at azimuth −30° from X axis, elevation 25°
//   Screen right  R = ( 0.500,  0.866,  0    )
//   Screen up     U = (−0.366,  0.212,  0.906)  [negated for SVG y-down]
//   Eye direction E = ( 0.785, −0.453,  0.423)  [for front-hemisphere test]
//
// Project world (x,y,z) → screen:
//   sx = CX + SR*(0.500·x + 0.866·y)
//   sy = CY + SR*(0.366·x − 0.212·y − 0.906·z)

const DEG = Math.PI / 180

// Globe canvas / sphere
const W = 520, H = 420
const CX = 210, CY = 215
const SR = 125   // sphere radius (px)

const psx = (x, y, z) => CX + SR * ( 0.500 * x + 0.866 * y)
const psy = (x, y, z) => CY + SR * ( 0.366 * x - 0.212 * y - 0.906 * z)
const isFront = (x, y, z) => 0.785 * x - 0.453 * y + 0.423 * z > 0

// ── Curve generators ──────────────────────────────────────────────────────────

function latCircle(latDeg, step = 4) {
  const r = Math.cos(latDeg * DEG), z0 = Math.sin(latDeg * DEG)
  return Array.from({ length: Math.ceil(361 / step) + 1 }, (_, i) => {
    const phi = Math.min(i * step, 360) * DEG
    const x = r * Math.cos(phi), y = r * Math.sin(phi)
    return { sx: psx(x, y, z0), sy: psy(x, y, z0), v: isFront(x, y, z0) }
  })
}

function meridian(lonDeg, step = 2) {
  const phi = lonDeg * DEG
  return Array.from({ length: Math.ceil(181 / step) + 1 }, (_, i) => {
    const lam = Math.min(-90 + i * step, 90) * DEG
    const x = Math.cos(lam) * Math.cos(phi)
    const y = Math.cos(lam) * Math.sin(phi)
    const z = Math.sin(lam)
    return { sx: psx(x, y, z), sy: psy(x, y, z), v: isFront(x, y, z) }
  })
}

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

// ── Shared wireframe data (computed once) ──────────────────────────────────────

const WF = {
  lats:    [-60, -30, 30, 60].map(l => segments(latCircle(l))),
  mers:    [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(l => segments(meridian(l))),
  equator: segments(latCircle(0, 2)),
  prime:   segments(meridian(0, 2)),
}

// ── Shared SVG primitives ──────────────────────────────────────────────────────

function GlobeCurve({ segs, frontStroke, frontWidth = 0.8, frontOpacity = 0.65, frontDash = '' }) {
  return (
    <>
      {segs.map((s, i) => (
        <polyline key={i} points={toStr(s.pts)} fill="none"
          stroke={s.v ? frontStroke : '#1a2e4a'}
          strokeWidth={s.v ? frontWidth : 0.5}
          strokeDasharray={s.v ? frontDash : '3 2'}
          opacity={s.v ? frontOpacity : 0.3}
        />
      ))}
    </>
  )
}

function Arrow3D({ from3, to3, color, label, lx, ly, dashed = false, sw = 2.2, hw = 7, hl = 13, fs = 15 }) {
  const x0 = psx(...from3), y0 = psy(...from3)
  const x1 = psx(...to3),   y1 = psy(...to3)
  const dx = x1 - x0, dy = y1 - y0
  const len = Math.hypot(dx, dy)
  const ux = dx / len, uy = dy / len
  const bx = x1 - ux * hl, by = y1 - uy * hl
  const px = -uy, py = ux
  return (
    <g>
      <line x1={x0} y1={y0} x2={x1} y2={y1}
        stroke={color} strokeWidth={sw}
        strokeDasharray={dashed ? '5 3' : ''} />
      <polygon
        points={`${x1},${y1} ${bx + px*hw/2},${by + py*hw/2} ${bx - px*hw/2},${by - py*hw/2}`}
        fill={color}
      />
      {label && (
        <text x={lx ?? x1 + 10} y={ly ?? y1 + 4}
          fill={color} fontSize={fs} fontWeight={800} fontFamily="monospace">
          {label}
        </text>
      )}
    </g>
  )
}

function SphereLabel({ world, text, dx = 14, dy = 0, color = '#94a3b8', fontSize = 11 }) {
  const x = psx(...world), y = psy(...world)
  return (
    <g>
      <circle cx={x} cy={y} r={3} fill={color} />
      <line x1={x} y1={y} x2={x + dx * 0.6} y2={y + dy * 0.6}
        stroke={color} strokeWidth={1} opacity={0.5} />
      <text x={x + dx} y={y + dy + 4} fill={color} fontSize={fontSize}
        fontFamily="monospace" fontWeight={600}
        textAnchor={dx < 0 ? 'end' : 'start'}>
        {text}
      </text>
    </g>
  )
}

// ── ECEF Globe SVG ─────────────────────────────────────────────────────────────

function EcefGlobe() {
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <defs>
        <radialGradient id="ecefGrad" cx="38%" cy="35%" r="60%">
          <stop offset="0%"   stopColor="#0e2a45" />
          <stop offset="60%"  stopColor="#071525" />
          <stop offset="100%" stopColor="#030b14" />
        </radialGradient>
      </defs>

      <circle cx={CX} cy={CY} r={SR} fill="url(#ecefGrad)" />

      {WF.lats.map((s, i) => <GlobeCurve key={i} segs={s} frontStroke="#2d5a7a" frontWidth={0.7} frontOpacity={0.55} />)}
      {WF.mers.map((s, i) => <GlobeCurve key={i} segs={s} frontStroke="#2d5a7a" frontWidth={0.7} frontOpacity={0.55} />)}
      <GlobeCurve segs={WF.equator} frontStroke="#f59e0b" frontWidth={1.8} frontOpacity={0.9} />
      <GlobeCurve segs={WF.prime}   frontStroke="#cbd5e1" frontWidth={1.6} frontOpacity={0.85} />
      <circle cx={CX} cy={CY} r={SR} fill="none" stroke="#2d5a7a" strokeWidth={1} />

      <SphereLabel world={[0, 0, 1]} text="North Pole" dx={14} dy={-6} color="#94a3b8" />
      <SphereLabel world={[Math.cos(50*DEG), Math.sin(50*DEG), 0]} text="Equator" dx={12} dy={8} color="#f59e0b" />
      <SphereLabel world={[Math.cos(40*DEG), 0, Math.sin(40*DEG)]} text="Prime Meridian" dx={12} dy={2} color="#cbd5e1" />

      <Arrow3D from3={[-0.2, 0, 0]}  to3={[1.5, 0, 0]}  color="#ef4444" label="X"
        lx={psx(1.5, 0, 0) + 8}  ly={psy(1.5, 0, 0) + 5} />
      <Arrow3D from3={[0, -0.2, 0]}  to3={[0, 1.5, 0]}  color="#22c55e" label="Y"
        lx={psx(0, 1.5, 0) + 8}  ly={psy(0, 1.5, 0) + 4} />
      <Arrow3D from3={[0, 0, -0.25]} to3={[0, 0, 1.45]} color="#60a5fa" label="Z"
        lx={psx(0, 0, 1.45) + 8} ly={psy(0, 0, 1.45)} />
    </svg>
  )
}

// ── NED math (origin: 30°N, 20°E) ─────────────────────────────────────────────

const LAT0 = 30 * DEG
const LON0 = 20 * DEG

// Origin on unit sphere
const P0 = [
  Math.cos(LAT0) * Math.cos(LON0),
  Math.cos(LAT0) * Math.sin(LON0),
  Math.sin(LAT0),
]

// North: tangent direction toward geographic North
const N_hat = [
  -Math.sin(LAT0) * Math.cos(LON0),
  -Math.sin(LAT0) * Math.sin(LON0),
   Math.cos(LAT0),
]

// East: tangent direction toward geographic East
const E_hat = [
  -Math.sin(LON0),
   Math.cos(LON0),
   0,
]

// Down: radially inward (toward Earth center)
const D_hat = [-P0[0], -P0[1], -P0[2]]

// Tangent plane corner points (±PS in N and E from P0)
const PS = 0.40
const PLANE_PTS = [
  [ P0[0] + PS*(N_hat[0] + E_hat[0]),  P0[1] + PS*(N_hat[1] + E_hat[1]),  P0[2] + PS*(N_hat[2] + E_hat[2]) ],
  [ P0[0] + PS*(N_hat[0] - E_hat[0]),  P0[1] + PS*(N_hat[1] - E_hat[1]),  P0[2] + PS*(N_hat[2] - E_hat[2]) ],
  [ P0[0] + PS*(-N_hat[0] - E_hat[0]), P0[1] + PS*(-N_hat[1] - E_hat[1]), P0[2] + PS*(-N_hat[2] - E_hat[2]) ],
  [ P0[0] + PS*(-N_hat[0] + E_hat[0]), P0[1] + PS*(-N_hat[1] + E_hat[1]), P0[2] + PS*(-N_hat[2] + E_hat[2]) ],
]

// NED highlighted arc data
const WF_NED = {
  latArc: segments(latCircle(30, 3)),   // 30°N latitude ring
  lonArc: segments(meridian(20, 2)),    // 20°E meridian
}

// ── NED Globe SVG ──────────────────────────────────────────────────────────────

function NedGlobe() {
  const planeStr = PLANE_PTS.map(p => `${psx(...p).toFixed(1)},${psy(...p).toFixed(1)}`).join(' ')

  // NED axis endpoints
  const AX = 0.50
  const nTip = P0.map((v, i) => v + AX * N_hat[i])
  const eTip = P0.map((v, i) => v + AX * E_hat[i])
  // D arrow goes all the way to globe center for maximum visual impact
  const dTip = [0, 0, 0]

  // Label offsets for NED axes
  const nLX = psx(...nTip) - 16, nLY = psy(...nTip) - 6
  const eLX = psx(...eTip) + 8,  eLY = psy(...eTip) + 4
  const dLX = psx(...dTip) - 24, dLY = psy(...dTip) + 4

  // Anchor points for reference-line labels
  const eqLabelPt  = [0, -1, 0]                                              // lon=270° — left side of equator
  const pmLabelPt  = [Math.cos(-50*DEG), 0, Math.sin(-50*DEG)]              // lat=-50° — bottom of prime meridian
  const latLabelPt = [Math.cos(30*DEG), 0, Math.sin(30*DEG)]
  const lonLabelPt = [Math.cos(55*DEG)*Math.cos(20*DEG), Math.cos(55*DEG)*Math.sin(20*DEG), Math.sin(55*DEG)]

  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <defs>
        <radialGradient id="nedGrad" cx="38%" cy="35%" r="60%">
          <stop offset="0%"   stopColor="#0e2a45" />
          <stop offset="60%"  stopColor="#071525" />
          <stop offset="100%" stopColor="#030b14" />
        </radialGradient>
      </defs>

      {/* Globe fill */}
      <circle cx={CX} cy={CY} r={SR} fill="url(#nedGrad)" />

      {/* Base wireframe (faint) */}
      {WF.lats.map((s, i) => <GlobeCurve key={i} segs={s} frontStroke="#1e3a5f" frontWidth={0.6} frontOpacity={0.45} />)}
      {WF.mers.map((s, i) => <GlobeCurve key={i} segs={s} frontStroke="#1e3a5f" frontWidth={0.6} frontOpacity={0.45} />)}
      {/* Equator — dash-dot amber, matches ECEF */}
      <GlobeCurve segs={WF.equator} frontStroke="#f59e0b" frontWidth={1.4} frontOpacity={0.7} frontDash="8 3 2 3" />

      {/* Prime meridian — dash-dot light gray, matches ECEF */}
      <GlobeCurve segs={WF.prime} frontStroke="#cbd5e1" frontWidth={1.4} frontOpacity={0.7} frontDash="8 3 2 3" />

      {/* Highlighted lat arc (30°N) — violet */}
      <GlobeCurve segs={WF_NED.latArc} frontStroke="#a78bfa" frontWidth={2} frontOpacity={0.9} />

      {/* Highlighted meridian (20°E) — sky blue */}
      <GlobeCurve segs={WF_NED.lonArc} frontStroke="#38bdf8" frontWidth={2} frontOpacity={0.9} />

      {/* Globe outline */}
      <circle cx={CX} cy={CY} r={SR} fill="none" stroke="#2d5a7a" strokeWidth={1} />

      {/* Reference line labels */}
      <text x={psx(...eqLabelPt) - 6}  y={psy(...eqLabelPt) + 4}
        fill="#f59e0b" fontSize={10} fontFamily="monospace" fontWeight={600} textAnchor="end" opacity={0.85}>Equator</text>
      <text x={psx(...pmLabelPt) + 6}  y={psy(...pmLabelPt) + 14}
        fill="#cbd5e1" fontSize={10} fontFamily="monospace" fontWeight={600} opacity={0.85}>Prime Meridian</text>
      <text x={psx(...latLabelPt) - 6} y={psy(...latLabelPt) - 5}
        fill="#a78bfa" fontSize={10} fontFamily="monospace" fontWeight={600} textAnchor="end" opacity={0.9}>Lat 30°N</text>
      <text x={psx(...lonLabelPt) + 6} y={psy(...lonLabelPt) - 4}
        fill="#38bdf8" fontSize={10} fontFamily="monospace" fontWeight={600} opacity={0.9}>Lon 20°E</text>

      {/* Tangent plane — drawn before axes so axes appear on top */}
      <polygon points={planeStr}
        fill="rgba(148,163,184,0.10)"
        stroke="#94a3b8" strokeWidth={1.2} strokeOpacity={0.55}
        strokeDasharray="4 3"
      />

      {/* "tangent plane" label */}
      <text
        x={psx(...PLANE_PTS[0]) + 6} y={psy(...PLANE_PTS[0]) - 6}
        fill="#94a3b8" fontSize={10} fontFamily="monospace" opacity={0.8}>
        tangent plane
      </text>

      {/* NED origin dot */}
      <circle cx={psx(...P0)} cy={psy(...P0)} r={5}
        fill="#fbbf24" stroke="#0f172a" strokeWidth={1.5} />

      {/* NED axis arrows */}
      {/* N — green, tangent to surface toward North Pole */}
      <Arrow3D from3={P0} to3={nTip} color="#22c55e" label="N" lx={nLX} ly={nLY} />
      {/* E — amber, tangent to surface toward East */}
      <Arrow3D from3={P0} to3={eTip} color="#f59e0b" label="E" lx={eLX} ly={eLY} />
      {/* D — dashed, thick, extends all the way to globe center */}
      <Arrow3D from3={P0} to3={dTip} color="#ef4444" label="D" lx={dLX} ly={dLY} dashed sw={3.5} hw={10} hl={16} />
    </svg>
  )
}

// ── Matrix display helper ──────────────────────────────────────────────────────

function Matrix3({ rows, color = '#e2e8f0', fs = 13 }) {
  const fmt = v => {
    if (typeof v === 'string') return v
    if (Math.abs(v) < 0.00005) return '0'
    return v.toFixed(4)
  }
  return (
    <div style={{
      display: 'inline-grid', gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '5px 10px', padding: '10px 14px',
      borderLeft: '2px solid #475569', borderRight: '2px solid #475569',
      fontFamily: 'monospace', fontSize: fs, color,
    }}>
      {rows.flat().map((v, i) => (
        <span key={i} style={{
          textAlign: 'right', minWidth: 66,
          color: typeof v === 'string' ? '#94a3b8' : color,
        }}>{fmt(v)}</span>
      ))}
    </div>
  )
}

// ── ECEF → NED Transform section ───────────────────────────────────────────────

function EcefToNedSection() {
  const [lat, setLat] = useState(30)
  const [lon, setLon] = useState(20)
  const [vx, setVx] = useState(1)
  const [vy, setVy] = useState(0)
  const [vz, setVz] = useState(0)

  const phi = lat * DEG
  const lam = lon * DEG

  // Three elemental rotation matrices
  const Rz_nl = [
    [ Math.cos(lam),  Math.sin(lam), 0],
    [-Math.sin(lam),  Math.cos(lam), 0],
    [ 0,              0,             1],
  ]
  const Ry_np = [
    [ Math.cos(phi), 0, Math.sin(phi)],
    [ 0,             1, 0            ],
    [-Math.sin(phi), 0, Math.cos(phi)],
  ]
  const Ry_n90 = [[ 0, 0, 1], [0, 1, 0], [-1, 0, 0]]

  // T_ECEF^NED = R_y(-90°) · R_y(-φ) · R_z(λ)
  const T_ned = [
    [-Math.sin(phi)*Math.cos(lam), -Math.sin(phi)*Math.sin(lam),  Math.cos(phi)],
    [-Math.sin(lam),                Math.cos(lam),                 0            ],
    [-Math.cos(phi)*Math.cos(lam), -Math.cos(phi)*Math.sin(lam), -Math.sin(phi)],
  ]

  const vECEF = [Number(vx), Number(vy), Number(vz)]
  const vNED  = T_ned.map(row => row.reduce((s, c, i) => s + c * vECEF[i], 0))

  const card = {
    background: '#1e293b', border: '1px solid #334155', borderRadius: 10,
    padding: '18px 20px', flex: 1, minWidth: 220,
  }
  const inp = {
    background: '#0f172a', border: '1px solid #334155', borderRadius: 6,
    color: '#e2e8f0', fontFamily: 'monospace', fontSize: 13,
    padding: '6px 10px', width: 70, textAlign: 'center',
  }
  const resultBox = (col) => ({
    background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6,
    color: col, fontFamily: 'monospace', fontSize: 13,
    padding: '6px 10px', width: 72, textAlign: 'center',
  })

  return (
    <div>

      {/* Divider */}
      <div style={{ margin: '40px 0', padding: '20px 24px', background: '#0f172a', borderRadius: 12, border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 1, background: '#1e293b' }} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#3b82f6' }}>
            ROTATION MATRIX DERIVATION
          </span>
          <div style={{ flex: 1, height: 1, background: '#1e293b' }} />
        </div>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.75, margin: 0 }}>
          The ECEF-to-NED transformation is a product of three elemental rotations — the same
          R<sub>x</sub>, R<sub>y</sub>, R<sub>z</sub> building blocks from the 3D Matrix Trainer. Each step uses only λ or φ,
          the two angles that locate the NED origin on the globe.
        </p>
      </div>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>ECEF → NED</h2>
        <span style={{ fontSize: 15, color: '#64748b' }}>Transformation Matrix Derivation</span>
      </div>
      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 24 }}>
        Starting in ECEF, three sequential rotations re-orient the axes until they align with
        North, East, and Down at the chosen surface point. The combined transformation is
        <span style={{ color: '#cbd5e1' }}> T<sub>ECEF</sub><sup>NED</sup> = R<sub>y</sub>(−90°) · R<sub>y</sub>(−φ) · R<sub>z</sub>(λ)</span>.
      </p>

      {/* Step cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>

        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: '#3b82f6', marginBottom: 8 }}>Step 1</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Longitude — R<sub>z</sub>(λ)</div>
          <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, marginBottom: 14 }}>
            Positive right-hand rotation about Z (North Pole) by λ. Swings the X-axis to face the local meridian.
          </p>
          <Matrix3 fs={12} rows={[
            ['cosλ',  'sinλ', '0'],
            ['−sinλ', 'cosλ', '0'],
            ['0',     '0',    '1'],
          ]} />
        </div>

        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8b5cf6', marginBottom: 8 }}>Step 2</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Latitude — R<sub>y</sub>(−φ)</div>
          <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, marginBottom: 14 }}>
            Rotate about the intermediate Y-axis by −φ. Tilts X upward until it points radially outward from the surface point.
          </p>
          <Matrix3 fs={12} rows={[
            ['cosφ',  '0', 'sinφ'],
            ['0',     '1', '0'  ],
            ['−sinφ', '0', 'cosφ'],
          ]} />
        </div>

        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: '#0ea5e9', marginBottom: 8 }}>Step 3</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Align — R<sub>y</sub>(−90°)</div>
          <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, marginBottom: 14 }}>
            Rotate −90° about Y. The radially-outward X swings into Down; the Z-axis (pointing North) becomes the new X.
          </p>
          <Matrix3 fs={12} rows={[[ 0, 0, 1], [0, 1, 0], [-1, 0, 0]]} />
        </div>

      </div>

      {/* Combined formula */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '20px 24px', marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#475569', marginBottom: 14 }}>
          Combined Result
        </p>
        <div style={{ fontSize: 13, fontFamily: 'monospace', color: '#94a3b8', marginBottom: 16, lineHeight: 2 }}>
          <span style={{ color: '#e2e8f0', fontWeight: 700 }}>T<sub>ECEF</sub><sup>NED</sup></span>
          {' = R'}<sub>y</sub>{'(−90°) · R'}<sub>y</sub>{'(−φ) · R'}<sub>z</sub>{'(λ) = '}
        </div>
        <Matrix3 color="#cbd5e1" fs={13} rows={[
          ['−sinφ cosλ', '−sinφ sinλ', ' cosφ'],
          ['−sinλ',       ' cosλ',      '  0  '],
          ['−cosφ cosλ', '−cosφ sinλ', '−sinφ'],
        ]} />
        <p style={{ fontSize: 12, color: '#475569', marginTop: 14, marginBottom: 0, lineHeight: 1.7 }}>
          Each row is a NED axis expressed in ECEF:&nbsp;
          <span style={{ color: '#22c55e' }}>North</span> (row 1) ·&nbsp;
          <span style={{ color: '#f59e0b' }}>East</span> (row 2) ·&nbsp;
          <span style={{ color: '#ef4444' }}>Down</span> (row 3).&nbsp;
          Apply as <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>v_NED = T<sub>ECEF</sub><sup>NED</sup> · v_ECEF</span>.
        </p>
      </div>

      {/* Interactive calculator */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '22px 24px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#475569', marginBottom: 20 }}>
          Interactive Calculator
        </p>

        {/* Inputs */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 20, alignItems: 'flex-end' }}>
          {[['Latitude φ (°)', lat, setLat], ['Longitude λ (°)', lon, setLon]].map(([label, val, setter]) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
              <input type="number" value={val} onChange={e => setter(Number(e.target.value))} style={inp} />
            </div>
          ))}
        </div>

        {/* Elemental matrices */}
        <p style={{ fontSize: 11, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Elemental Matrices</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: '#3b82f6', marginBottom: 6 }}>R<sub>z</sub>(λ)</div>
            <Matrix3 rows={Rz_nl} fs={12} color="#93c5fd" />
          </div>
          <div style={{ fontSize: 18, color: '#334155', alignSelf: 'center', paddingTop: 8 }}>·</div>
          <div>
            <div style={{ fontSize: 11, color: '#8b5cf6', marginBottom: 6 }}>R<sub>y</sub>(−φ)</div>
            <Matrix3 rows={Ry_np} fs={12} color="#c4b5fd" />
          </div>
          <div style={{ fontSize: 18, color: '#334155', alignSelf: 'center', paddingTop: 8 }}>·</div>
          <div>
            <div style={{ fontSize: 11, color: '#0ea5e9', marginBottom: 6 }}>R<sub>y</sub>(−90°)</div>
            <Matrix3 rows={Ry_n90} fs={12} color="#7dd3fc" />
          </div>
        </div>

        {/* Combined numerical matrix */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
            T<sub>ECEF</sub><sup>NED</sup> ({lat}°N, {lon}°E)
          </div>
          <Matrix3 rows={T_ned} color="#e2e8f0" fs={13} />
        </div>

        {/* Vector transform */}
        <div style={{ borderTop: '1px solid #334155', paddingTop: 20 }}>
          <p style={{ fontSize: 11, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>
            Transform a Vector
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>ECEF input</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['X', vx, setVx], ['Y', vy, setVy], ['Z', vz, setVz]].map(([label, val, setter]) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>{label}</div>
                    <input type="number" value={val} onChange={e => setter(e.target.value)}
                      style={{ ...inp, width: 62 }} />
                  </div>
                ))}
              </div>
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: 18, color: '#334155', paddingBottom: 4 }}>→</span>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>NED result</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['N', vNED[0], '#22c55e'], ['E', vNED[1], '#f59e0b'], ['D', vNED[2], '#ef4444']].map(([label, val, col]) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>{label}</div>
                    <div style={resultBox(col)}>{isNaN(val) ? '—' : val.toFixed(4)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

// ── Axis cards ─────────────────────────────────────────────────────────────────

const ECEF_AXES = [
  {
    label: 'X', color: '#ef4444', bg: '#7f1d1d22',
    title: 'Equator × Prime Meridian',
    body: "Points outward through the intersection of the equatorial plane and the Prime Meridian (0°N, 0°E) — in the Gulf of Guinea off the west coast of Africa.",
  },
  {
    label: 'Y', color: '#22c55e', bg: '#14532d22',
    title: '90° East on the Equator',
    body: "Perpendicular to X in the equatorial plane, pointing toward 0°N, 90°E — in the Indian Ocean. Completes the right-handed triad with X and Z.",
  },
  {
    label: 'Z', color: '#60a5fa', bg: '#1e3a5f44',
    title: 'North Pole / Spin Axis',
    body: "Aligned with Earth's mean rotation axis, pointing toward the North Pole. Perpendicular to the equatorial plane.",
  },
]

const NED_AXES = [
  {
    label: 'N', color: '#22c55e', bg: '#14532d22',
    title: 'North — along surface toward pole',
    body: 'Points in the direction of increasing latitude along the surface. Tangent to the sphere at the origin, aimed at geographic North. Also called the "forward" direction in many navigation conventions.',
  },
  {
    label: 'E', color: '#f59e0b', bg: '#78350f22',
    title: 'East — along surface toward 90°E',
    body: 'Points in the direction of increasing longitude along the surface. Tangent to the sphere at the origin, perpendicular to N. Always lies in the local horizontal plane.',
  },
  {
    label: 'D', color: '#ef4444', bg: '#7f1d1d22',
    title: 'Down — toward Earth\'s center',
    body: 'Points radially inward, toward Earth\'s center of mass — i.e., in the direction of local gravity. Perpendicular to the local horizontal plane (the tangent plane). Shown dashed because it enters the sphere.',
  },
]

function AxisCards({ axes }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 260 }}>
      {axes.map(ax => (
        <div key={ax.label} style={{
          background: ax.bg, border: `1px solid ${ax.color}44`,
          borderLeft: `3px solid ${ax.color}`, borderRadius: 10, padding: '14px 16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 16, color: ax.color, width: 20 }}>{ax.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1' }}>{ax.title}</span>
          </div>
          <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>{ax.body}</p>
        </div>
      ))}
    </div>
  )
}

function KeyProps({ items }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 10, padding: '18px 20px', border: '1px solid #334155' }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#475569', marginBottom: 14 }}>
        Key Properties
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        {items.map(({ label, val }) => (
          <div key={label} style={{ minWidth: 180 }}>
            <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 13, color: '#cbd5e1' }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Section divider with arrow ──────────────────────────────────────────────────

function TransitionBand() {
  return (
    <div style={{ margin: '40px 0', padding: '20px 24px', background: '#0f172a', borderRadius: 12, border: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, background: '#1e293b' }} />
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#3b82f6' }}>
          ECEF → NED
        </span>
        <div style={{ flex: 1, height: 1, background: '#1e293b' }} />
      </div>
      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.75, margin: 0 }}>
        The NED frame is defined relative to a specific point on Earth's surface. Pick a latitude φ and
        longitude λ — that becomes the NED origin. The key difference from ECEF is that the origin and
        axes are <em>local</em>: they depend on where you are standing on the globe.
      </p>
      <ul style={{ fontSize: 13, color: '#64748b', lineHeight: 2.1, marginLeft: 20, marginTop: 10, marginBottom: 0 }}>
        <li>The <span style={{ color: '#a78bfa' }}>latitude arc</span> and <span style={{ color: '#38bdf8' }}>longitude meridian</span> in the diagram below locate the NED origin within ECEF.</li>
        <li>The tangent plane at the origin becomes the local horizontal — N and E live in it.</li>
        <li>D is the outward surface normal flipped inward, aligned with the local gravity vector.</li>
        <li>Rotating from ECEF to NED requires only φ and λ — two angles, two elemental rotations.</li>
      </ul>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReferenceFramesPage() {
  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 20px' }}>

      {/* ── ECEF section ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>ECEF</h2>
          <span style={{ fontSize: 15, color: '#64748b' }}>Earth-Centered, Earth-Fixed</span>
        </div>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 20 }}>
          A Cartesian frame whose origin sits at Earth's center of mass. The axes are fixed
          to Earth and rotate with it, so a point on the ground has constant ECEF coordinates
          (ignoring tectonic drift). All GPS coordinates are ultimately expressed in ECEF.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ background: '#060f1a', borderRadius: 12, border: '1px solid #1e3050', overflow: 'hidden', flexShrink: 0 }}>
            <EcefGlobe />
            <div style={{ display: 'flex', gap: 16, padding: '8px 16px 12px', justifyContent: 'center', fontSize: 12, flexWrap: 'wrap' }}>
              <span style={{ color: '#ef4444' }}>■ X</span>
              <span style={{ color: '#22c55e' }}>■ Y</span>
              <span style={{ color: '#60a5fa' }}>■ Z</span>
              <span style={{ color: '#f59e0b' }}>— Equator</span>
              <span style={{ color: '#cbd5e1' }}>— Prime Meridian</span>
            </div>
          </div>
          <AxisCards axes={ECEF_AXES} />
        </div>
        <KeyProps items={[
          { label: 'Origin',      val: "Earth's center of mass" },
          { label: 'Handedness',  val: 'Right-handed (X × Y = Z)' },
          { label: 'Rotates with',val: 'Earth (sidereal rotation)' },
          { label: 'Units',       val: 'Meters (SI)' },
          { label: 'Epoch',       val: 'Fixed to WGS-84 ellipsoid' },
          { label: 'Common use',  val: 'GPS, satellite orbits, geodesy' },
        ]} />
      </div>

      {/* ── Transition ── */}
      <TransitionBand />

      {/* ── NED section ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>NED</h2>
          <span style={{ fontSize: 15, color: '#64748b' }}>North East Down</span>
        </div>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 20 }}>
          A local frame anchored to a point on Earth's surface. The diagram below shows the NED
          origin placed at <span style={{ color: '#fbbf24', fontFamily: 'monospace' }}>30°N, 20°E</span> within
          ECEF. The <span style={{ color: '#a78bfa' }}>violet arc</span> traces the 30th parallel and
          the <span style={{ color: '#38bdf8' }}>blue arc</span> traces the 20° meridian — their
          intersection is the NED origin. The tangent plane at that point becomes the local horizontal.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ background: '#060f1a', borderRadius: 12, border: '1px solid #1e3050', overflow: 'hidden', flexShrink: 0 }}>
            <NedGlobe />
            <div style={{ display: 'flex', gap: 16, padding: '8px 16px 12px', justifyContent: 'center', fontSize: 12, flexWrap: 'wrap' }}>
              <span style={{ color: '#22c55e' }}>■ N (North)</span>
              <span style={{ color: '#f59e0b' }}>■ E (East)</span>
              <span style={{ color: '#ef4444' }}>-- D (Down)</span>
              <span style={{ color: '#fbbf24' }}>● Origin</span>
            </div>
          </div>
          <AxisCards axes={NED_AXES} />
        </div>
        <KeyProps items={[
          { label: 'Origin',       val: 'Any surface point (lat, lon)' },
          { label: 'Handedness',   val: 'Right-handed (N × E = D)' },
          { label: 'Local level',  val: 'N and E span the horizontal plane' },
          { label: 'D aligned with', val: 'Local gravity (nadir direction)' },
          { label: 'Changes with', val: 'Choice of origin (lat/lon)' },
          { label: 'Common use',   val: 'Aviation, INS, sensor fusion, autopilots' },
        ]} />
      </div>

      {/* ── ECEF → NED Transform section ── */}
      <EcefToNedSection />

    </div>
  )
}
