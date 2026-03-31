import { useState, useCallback } from 'react'
import { evalExpr, nearlyEqual } from './mathEval.js'

// ── math helpers ───────────────────────────────────────────────────────────────

const RAD = Math.PI / 180
const cos = (deg) => Math.cos(deg * RAD)
const sin = (deg) => Math.sin(deg * RAD)
const fmtVal = (n) => {
  if (Math.abs(n) < 1e-10) return '0'
  if (Math.abs(n - 1) < 1e-10) return '1'
  if (Math.abs(n + 1) < 1e-10) return '-1'
  return n.toFixed(4).replace(/\.?0+$/, '')
}

const ANGLES = [-60, -45, -30, 30, 45, 60, 90, 120, 135, 150]
const randAngle = () => ANGLES[Math.floor(Math.random() * ANGLES.length)]

// ── SVG Frame Diagram ──────────────────────────────────────────────────────────

function Arrow({ cx, cy, dx, dy, color, label, labelOffset = [8, -8] }) {
  const len = Math.hypot(dx, dy)
  const ux = dx / len, uy = dy / len
  // arrowhead
  const hw = 7, hl = 12
  const px = -uy, py = ux
  const tip = { x: cx + dx, y: cy + dy }
  const base = { x: tip.x - ux * hl, y: tip.y - uy * hl }
  const p1 = { x: base.x + px * hw / 2, y: base.y + py * hw / 2 }
  const p2 = { x: base.x - px * hw / 2, y: base.y - py * hw / 2 }
  return (
    <g>
      <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke={color} strokeWidth={2.5} />
      <polygon points={`${tip.x},${tip.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`} fill={color} />
      {label && (
        <text x={tip.x + labelOffset[0]} y={tip.y + labelOffset[1]} fill={color} fontSize={14} fontWeight={700} fontFamily="monospace">
          {label}
        </text>
      )}
    </g>
  )
}

function ArcAngle({ cx, cy, r, startDeg, endDeg, color }) {
  const x1 = cx + r * Math.cos(startDeg * RAD)
  const y1 = cy - r * Math.sin(startDeg * RAD)   // SVG y is flipped
  const x2 = cx + r * Math.cos(endDeg * RAD)
  const y2 = cy - r * Math.sin(endDeg * RAD)
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
  const sweep = endDeg >= startDeg ? 0 : 1
  return (
    <path
      d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} ${sweep} ${x2} ${y2}`}
      fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="4 3"
    />
  )
}

function DashedProjection({ cx, cy, ax, ay, color }) {
  return (
    <line
      x1={cx} y1={cy} x2={ax} y2={ay}
      stroke={color} strokeWidth={1.2} strokeDasharray="5 4" opacity={0.6}
    />
  )
}

// Label with a dark background rect for readability over any geometry
function ProjLabel({ x, y, text, color, anchor = 'middle' }) {
  const charW = 7.5
  const w = text.length * charW + 8
  const h = 16
  const offX = anchor === 'end' ? -w : anchor === 'start' ? 0 : -w / 2
  return (
    <g>
      <rect x={x + offX} y={y - 12} width={w} height={h} rx={3} fill="#0a1120" opacity={0.85} />
      <text x={x} y={y} fill={color} fontSize={12} textAnchor={anchor} fontFamily="monospace" fontWeight={600}>
        {text}
      </text>
    </g>
  )
}

function FrameDiagram({ theta, showProjections, step }) {
  const W = 360, H = 320
  const cx = W / 2, cy = H / 2
  const L = 110  // axis length in px

  // Frame 1 axes (fixed, standard)
  const f1x = { dx: L, dy: 0 }
  const f1y = { dx: 0, dy: -L }

  // Frame 2 axes (rotated by theta CCW — SVG y-flip means we negate sin for y)
  const f2x = { dx: L * cos(theta), dy: -L * sin(theta) }
  const f2y = { dx: -L * sin(theta), dy: -L * cos(theta) }

  // Projection points of x̂₂ tip onto Frame 1 axes
  const x2tip = { x: cx + f2x.dx, y: cy + f2x.dy }
  const projOnF1x = { x: cx + f2x.dx, y: cy }         // project onto x-axis
  const projOnF1y = { x: cx, y: cy + f2x.dy }          // project onto y-axis

  // Projection points of ŷ₂ tip
  const y2tip = { x: cx + f2y.dx, y: cy + f2y.dy }
  const projY2OnF1x = { x: cx + f2y.dx, y: cy }
  const projY2OnF1y = { x: cx, y: cy + f2y.dy }

  return (
    <svg width={W} height={H} style={{ display: 'block', margin: '0 auto' }}>
      {/* Grid dot */}
      <circle cx={cx} cy={cy} r={3} fill="#334155" />

      {/* Frame 1 axes */}
      <Arrow cx={cx} cy={cy} dx={f1x.dx} dy={f1x.dy} color="#64748b" label="x̂₁" labelOffset={[6, 4]} />
      <Arrow cx={cx} cy={cy} dx={f1y.dx} dy={f1y.dy} color="#64748b" label="ŷ₁" labelOffset={[6, -4]} />

      {/* Frame 2 axes */}
      <Arrow cx={cx} cy={cy} dx={f2x.dx} dy={f2x.dy} color="#3b82f6" label="x̂₂" labelOffset={[6, 4]} />
      <Arrow cx={cx} cy={cy} dx={f2y.dx} dy={f2y.dy} color="#a78bfa" label="ŷ₂" labelOffset={[6, -4]} />

      {/* Angle arc */}
      <ArcAngle cx={cx} cy={cy} r={38} startDeg={0} endDeg={theta} color="#fbbf24" />
      <text
        x={cx + 48 * cos(theta / 2)}
        y={cy - 48 * sin(theta / 2) + 4}
        fill="#fbbf24" fontSize={13} fontWeight={600} fontFamily="monospace"
      >
        θ
      </text>

      {/* Projections for step 1 (x̂₂ onto Frame 1 axes) */}
      {showProjections && step >= 1 && (() => {
        // Vertical dashed line: x2tip → projOnF1x (constant x, y spans to cy)
        const vMidX = x2tip.x
        const vMidY = (x2tip.y + cy) / 2
        const vAnchor = x2tip.x >= cx ? 'start' : 'end'
        const vDx = x2tip.x >= cx ? 12 : -12
        const vLineLen = Math.abs(x2tip.y - cy)

        // Horizontal dashed line: x2tip → projOnF1y (constant y, x spans to cx)
        const hMidX = (x2tip.x + cx) / 2
        const hMidY = x2tip.y
        // offset label above or below depending on which half of the SVG the line is on
        const hDy = x2tip.y < cy ? -10 : 14
        const hLineLen = Math.abs(x2tip.x - cx)

        return (
          <g>
            <DashedProjection cx={x2tip.x} cy={x2tip.y} ax={projOnF1x.x} ay={projOnF1x.y} color="#3b82f6" />
            <DashedProjection cx={x2tip.x} cy={x2tip.y} ax={projOnF1y.x} ay={projOnF1y.y} color="#3b82f6" />
            <circle cx={projOnF1x.x} cy={projOnF1x.y} r={4} fill="#3b82f6" opacity={0.8} />
            <circle cx={projOnF1y.x} cy={projOnF1y.y} r={4} fill="#3b82f6" opacity={0.8} />
            {vLineLen > 18 && <ProjLabel x={vMidX + vDx} y={vMidY} text="sin θ" color="#3b82f6" anchor={vAnchor} />}
            {hLineLen > 18 && <ProjLabel x={hMidX} y={hMidY + hDy} text="cos θ" color="#3b82f6" anchor="middle" />}
          </g>
        )
      })()}

      {/* Projections for step 2 (ŷ₂ onto Frame 1 axes) */}
      {showProjections && step >= 2 && (() => {
        // Vertical dashed line: y2tip → projY2OnF1x (constant x, y spans to cy)
        const vMidX = y2tip.x
        const vMidY = (y2tip.y + cy) / 2
        const vAnchor = y2tip.x >= cx ? 'start' : 'end'
        const vDx = y2tip.x >= cx ? 12 : -12
        const vLineLen = Math.abs(y2tip.y - cy)

        // Horizontal dashed line: y2tip → projY2OnF1y (constant y, x spans to cx)
        const hMidX = (y2tip.x + cx) / 2
        const hMidY = y2tip.y
        const hDy = y2tip.y < cy ? -10 : 14
        const hLineLen = Math.abs(y2tip.x - cx)

        return (
          <g>
            <DashedProjection cx={y2tip.x} cy={y2tip.y} ax={projY2OnF1x.x} ay={projY2OnF1x.y} color="#a78bfa" />
            <DashedProjection cx={y2tip.x} cy={y2tip.y} ax={projY2OnF1y.x} ay={projY2OnF1y.y} color="#a78bfa" />
            <circle cx={projY2OnF1x.x} cy={projY2OnF1x.y} r={4} fill="#a78bfa" opacity={0.8} />
            <circle cx={projY2OnF1y.x} cy={projY2OnF1y.y} r={4} fill="#a78bfa" opacity={0.8} />
            {vLineLen > 18 && <ProjLabel x={vMidX + vDx} y={vMidY} text="cos θ" color="#a78bfa" anchor={vAnchor} />}
            {hLineLen > 18 && <ProjLabel x={hMidX} y={hMidY + hDy} text="-sin θ" color="#a78bfa" anchor="middle" />}
          </g>
        )
      })()}

      {/* Origin label */}
      <text x={cx + 6} y={cy + 14} fill="#475569" fontSize={11} fontFamily="monospace">O</text>
    </svg>
  )
}

// ── Matrix Builder Display ─────────────────────────────────────────────────────

function MatrixBuilder({ col1, col2, theta, complete }) {
  const cellStyle = (val, known) => ({
    width: 80, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'monospace', fontSize: 14, fontWeight: 600, borderRadius: 6,
    background: known ? '#1e293b' : '#0f172a',
    color: known ? '#e2e8f0' : '#334155',
    border: `1px solid ${known ? '#3b82f6' : '#1e293b'}`,
    transition: 'all 0.3s'
  })

  const entries = [
    [col1 !== null ? fmtVal(col1[0]) : '?', col2 !== null ? fmtVal(col2[0]) : '?'],
    [col1 !== null ? fmtVal(col1[1]) : '?', col2 !== null ? fmtVal(col2[1]) : '?'],
  ]
  const known = [
    [col1 !== null, col2 !== null],
    [col1 !== null, col2 !== null],
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {entries[0].map((v, c) => (
            <div key={c} style={cellStyle(v, known[0][c])}>{v}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {entries[1].map((v, c) => (
            <div key={c} style={cellStyle(v, known[1][c])}>{v}</div>
          ))}
        </div>
      </div>
      {complete && (
        <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#64748b', lineHeight: 1.8 }}>
          <div>= R({theta}°)</div>
          <div>= [[cos θ, -sin θ],</div>
          <div>&nbsp;&nbsp;&nbsp;[sin θ,  cos θ]]</div>
        </div>
      )}
    </div>
  )
}

// ── Number Entry ───────────────────────────────────────────────────────────────

function ComponentInput({ labels, values, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ color: '#64748b', fontFamily: 'monospace' }}>[</span>
      {labels.map((label, i) => (
        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{label}:</span>
          <input
            type="text"
            value={values[i]}
            onChange={e => {
              const next = [...values]
              next[i] = e.target.value
              onChange(next)
            }}
            disabled={disabled}
            placeholder="e.g. cos(60)"
            style={{
              width: 110, padding: '6px 8px',
              background: disabled ? '#1e293b' : '#0f172a',
              border: '1px solid #334155', borderRadius: 6,
              color: disabled ? '#475569' : '#e2e8f0', fontSize: 13,
              fontFamily: 'monospace'
            }}
          />
        </label>
      ))}
      <span style={{ color: '#64748b', fontFamily: 'monospace' }}>]</span>
    </div>
  )
}

// ── Step feedback pill ─────────────────────────────────────────────────────────

function Feedback({ status, msg }) {
  if (!status) return null
  const ok = status === 'correct'
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
      background: ok ? '#14532d33' : '#7f1d1d33',
      border: `1px solid ${ok ? '#22c55e66' : '#ef444466'}`,
      color: ok ? '#22c55e' : '#ef4444'
    }}>
      {ok ? '✓' : '✗'} {msg}
    </div>
  )
}

// ── Main DecompositionPage ─────────────────────────────────────────────────────

export default function DecompositionPage() {
  const [theta, setTheta] = useState(-60)
  const [step, setStep] = useState(1)            // 1 = find x̂₂, 2 = find ŷ₂, 3 = done
  const [input1, setInput1] = useState(['', '']) // x̂₂ in F1
  const [input2, setInput2] = useState(['', '']) // ŷ₂ in F1
  const [fb1, setFb1] = useState(null)
  const [fb2, setFb2] = useState(null)
  const [showProjections, setShowProjections] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })

  const col1Answer = [cos(theta), sin(theta)]     // x̂₂ in F1
  const col2Answer = [-sin(theta), cos(theta)]    // ŷ₂ in F1

  const check1 = () => {
    const [a, b] = input1.map(evalExpr)
    const ok = nearlyEqual(a, col1Answer[0]) && nearlyEqual(b, col1Answer[1])
    setFb1(ok ? 'correct' : 'wrong')
    if (ok) {
      setScore(s => ({ correct: s.correct + 1, total: s.total + 1 }))
      setStep(2)
    } else {
      setScore(s => ({ ...s, total: s.total + 1 }))
    }
  }

  const check2 = () => {
    const [a, b] = input2.map(evalExpr)
    const ok = nearlyEqual(a, col2Answer[0]) && nearlyEqual(b, col2Answer[1])
    setFb2(ok ? 'correct' : 'wrong')
    if (ok) {
      setScore(s => ({ correct: s.correct + 1, total: s.total + 1 }))
      setStep(3)
    } else {
      setScore(s => ({ ...s, total: s.total + 1 }))
    }
  }

  const reset = useCallback(() => {
    setTheta(randAngle())
    setStep(1)
    setInput1(['', ''])
    setInput2(['', ''])
    setFb1(null)
    setFb2(null)
    setShowProjections(false)
  }, [])

  const col1Display = step >= 2 || fb1 === 'correct' ? col1Answer : null
  const col2Display = step >= 3 || fb2 === 'correct' ? col2Answer : null

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
          Rotation Matrices
        </h2>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Build R(θ) by expressing Frame 2's axes in Frame 1 coordinates.
          Each column of R(θ) is one of those axis vectors.
        </p>
      </div>

      {/* ── Worked Example ──────────────────────────────────────────────────── */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 24, marginBottom: 32 }}>
        <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: '#475569', marginBottom: 16 }}>
          Worked Example — θ = 30°
        </p>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 20 }}>
          Frame 2 is rotated 30° counter-clockwise from Frame 1. To build the rotation matrix, we need
          to express each of Frame 2's axes as a vector in Frame 1's coordinates — these become the
          columns of R(30°).
        </p>

        {/* Diagram with projections always on */}
        <div style={{ marginBottom: 24, background: '#0a1120', borderRadius: 10, padding: '12px 0 8px', border: '1px solid #1e293b' }}>
          <div style={{ textAlign: 'center', marginBottom: 6 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#fbbf24' }}>θ = 30°</span>
            <span style={{ marginLeft: 14, fontSize: 12, color: '#475569' }}>projection lines shown</span>
          </div>
          <FrameDiagram theta={30} showProjections={true} step={2} />
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, padding: '6px 0', fontSize: 12 }}>
            <span style={{ color: '#64748b' }}>■ Frame 1 (gray)</span>
            <span style={{ color: '#3b82f6' }}>■ x̂₂ (blue)</span>
            <span style={{ color: '#a78bfa' }}>■ ŷ₂ (purple)</span>
          </div>
        </div>

        {/* Step-by-step walkthrough */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Step 1 */}
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', background: '#1d4ed8', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 1
            }}>1</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6', marginBottom: 4 }}>
                Find x̂₂ — the blue axis — in Frame 1 coordinates
              </p>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 6 }}>
                Project x̂₂ onto each Frame 1 axis using the dot product. The dashed blue lines show these
                projections dropping perpendicularly onto x̂₁ and ŷ₁.
              </p>
              <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#94a3b8', lineHeight: 2, paddingLeft: 4 }}>
                <div>x̂₂ · x̂₁ = cos 30° = √3/2 ≈ 0.866 &nbsp;<span style={{ color: '#64748b' }}>(how far x̂₂ reaches along x̂₁)</span></div>
                <div>x̂₂ · ŷ₁ = sin 30° = 1/2 = 0.5 &nbsp;<span style={{ color: '#64748b' }}>(how far x̂₂ reaches along ŷ₁)</span></div>
                <div style={{ color: '#3b82f6', marginTop: 4 }}>x̂₂ in F1 = [cos 30°, sin 30°] = [√3/2, 1/2]</div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', background: '#7c3aed', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 1
            }}>2</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#a78bfa', marginBottom: 4 }}>
                Find ŷ₂ — the purple axis — in Frame 1 coordinates
              </p>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 6 }}>
                ŷ₂ is always 90° CCW from x̂₂. Project it the same way. Notice the sin term is now
                negative along x̂₁ — ŷ₂ has swung past vertical into the second quadrant.
              </p>
              <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#94a3b8', lineHeight: 2, paddingLeft: 4 }}>
                <div>ŷ₂ · x̂₁ = −sin 30° = −1/2 = −0.5</div>
                <div>ŷ₂ · ŷ₁ = &nbsp;cos 30° = √3/2 ≈ &nbsp;0.866</div>
                <div style={{ color: '#a78bfa', marginTop: 4 }}>ŷ₂ in F1 = [−sin 30°, cos 30°] = [−1/2, √3/2]</div>
              </div>
            </div>
          </div>

          {/* Step 3 — assemble */}
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', background: '#0369a1', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 1
            }}>3</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#22d3ee', marginBottom: 4 }}>
                Assemble the matrix — each axis vector becomes a column
              </p>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 8 }}>
                Place x̂₂ as column 1 and ŷ₂ as column 2. The result is R(30°):
              </p>
              <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#e2e8f0', lineHeight: 2.2, paddingLeft: 4 }}>
                <div>R(30°) = [ x̂₂ | ŷ₂ ]</div>
                <div style={{ color: '#94a3b8' }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = [[ cos30°, −sin30° ],</div>
                <div style={{ color: '#94a3b8' }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[ sin30°,  cos30° ]]</div>
                <div style={{ marginTop: 4 }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = [[ √3/2, −1/2 ],</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[ 1/2,  √3/2 ]]</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 }}>
        Now try it yourself — a new angle will be shown below.
      </p>

      {/* Score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: '#64748b' }}>
          Score: {score.correct}/{score.total}
          {score.total > 0 && ` (${Math.round(score.correct / score.total * 100)}%)`}
        </span>
        <button
          onClick={() => setShowProjections(v => !v)}
          style={{
            fontSize: 12, padding: '4px 12px', borderRadius: 6,
            background: showProjections ? '#1d4ed8' : '#1e293b',
            color: '#94a3b8', border: '1px solid #334155', cursor: 'pointer'
          }}
        >
          {showProjections ? 'Hide' : 'Show'} projections
        </button>
      </div>

      {/* Diagram */}
      <div style={{ background: '#0f172a', borderRadius: 12, padding: '16px 0 8px', marginBottom: 24, border: '1px solid #1e293b' }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 15, color: '#fbbf24' }}>θ = {theta}°</span>
          <span style={{ marginLeft: 16, fontSize: 13, color: '#475569' }}>Frame 2 rotated CCW from Frame 1</span>
        </div>
        <FrameDiagram theta={theta} showProjections={showProjections} step={step} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, padding: '8px 0', fontSize: 12 }}>
          <span style={{ color: '#64748b' }}>■ Frame 1 (gray)</span>
          <span style={{ color: '#3b82f6' }}>■ x̂₂ (blue)</span>
          <span style={{ color: '#a78bfa' }}>■ ŷ₂ (purple)</span>
        </div>
      </div>

      {/* Matrix being built */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
          Building R(θ) — columns = Frame 2 axes in Frame 1:
        </p>
        <MatrixBuilder col1={col1Display} col2={col2Display} theta={theta} complete={step === 3} />
      </div>

      {/* Step 1 */}
      <div style={{
        background: '#1e293b', borderRadius: 10, padding: 20, marginBottom: 16,
        border: `1px solid ${step === 1 ? '#3b82f6' : fb1 === 'correct' ? '#22c55e44' : '#334155'}`,
        opacity: step < 1 ? 0.5 : 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{
            width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: fb1 === 'correct' ? '#22c55e' : '#1d4ed8', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0
          }}>1</span>
          <span style={{ fontSize: 15, color: '#cbd5e1', fontWeight: 600 }}>
            Express <span style={{ color: '#3b82f6', fontFamily: 'monospace' }}>x̂₂</span> in Frame 1
          </span>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
          Project x̂₂ (the blue axis) onto each Frame 1 axis. Enter [x₁-component, y₁-component]:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <ComponentInput
            labels={['x₁', 'y₁']}
            values={input1}
            onChange={setInput1}
            disabled={step !== 1}
          />
          {step === 1 && (
            <button
              onClick={check1}
              style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Check
            </button>
          )}
          <Feedback
            status={fb1}
            msg={fb1 === 'correct' ? `x̂₂ = [${col1Answer.map(fmtVal).join(', ')}]` : `Hint: use cos θ and sin θ`}
          />
        </div>
      </div>

      {/* Step 2 */}
      <div style={{
        background: '#1e293b', borderRadius: 10, padding: 20, marginBottom: 16,
        border: `1px solid ${step === 2 ? '#a78bfa' : fb2 === 'correct' ? '#22c55e44' : '#334155'}`,
        opacity: step < 2 ? 0.4 : 1,
        transition: 'opacity 0.3s'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{
            width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: fb2 === 'correct' ? '#22c55e' : '#7c3aed', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0
          }}>2</span>
          <span style={{ fontSize: 15, color: '#cbd5e1', fontWeight: 600 }}>
            Express <span style={{ color: '#a78bfa', fontFamily: 'monospace' }}>ŷ₂</span> in Frame 1
          </span>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
          Project ŷ₂ (the purple axis) onto each Frame 1 axis. Enter [x₁-component, y₁-component]:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <ComponentInput
            labels={['x₁', 'y₁']}
            values={input2}
            onChange={setInput2}
            disabled={step !== 2}
          />
          {step === 2 && (
            <button
              onClick={check2}
              style={{ padding: '8px 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Check
            </button>
          )}
          <Feedback
            status={fb2}
            msg={fb2 === 'correct' ? `ŷ₂ = [${col2Answer.map(fmtVal).join(', ')}]` : `Hint: ŷ₂ is 90° CCW from x̂₂`}
          />
        </div>
      </div>

      {/* Step 3 — complete */}
      {step === 3 && (
        <div style={{
          background: '#14532d22', border: '1px solid #22c55e44', borderRadius: 10, padding: 20, marginBottom: 16
        }}>
          <p style={{ color: '#22c55e', fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
            Matrix assembled!
          </p>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#94a3b8', lineHeight: 2 }}>
            <div>Column 1 = x̂₂ in F1 = [cos {theta}°, sin {theta}°] = [{fmtVal(cos(theta))}, {fmtVal(sin(theta))}]</div>
            <div>Column 2 = ŷ₂ in F1 = [-sin {theta}°, cos {theta}°] = [{fmtVal(-sin(theta))}, {fmtVal(cos(theta))}]</div>
            <div style={{ marginTop: 8, color: '#e2e8f0' }}>
              R({theta}°) = [[{fmtVal(cos(theta))}, {fmtVal(-sin(theta))}], [{fmtVal(sin(theta))}, {fmtVal(cos(theta))}]]
            </div>
          </div>
          <button
            onClick={reset}
            style={{ marginTop: 16, padding: '10px 24px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            Next Angle
          </button>
        </div>
      )}

      {/* Hint / theory box */}
      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: 'pointer', color: '#64748b', fontSize: 13, userSelect: 'none' }}>
          How this works
        </summary>
        <div style={{ marginTop: 10, padding: 16, background: '#0f172a', borderRadius: 8, fontSize: 13, color: '#64748b', lineHeight: 1.8 }}>
          <p>Frame 2 is rotated CCW by θ from Frame 1. Its axes in Frame 1 coordinates are:</p>
          <ul style={{ marginLeft: 16, marginTop: 6 }}>
            <li><span style={{ color: '#3b82f6', fontFamily: 'monospace' }}>x̂₂</span> = [cos θ, sin θ]</li>
            <li><span style={{ color: '#a78bfa', fontFamily: 'monospace' }}>ŷ₂</span> = [-sin θ, cos θ]  (90° CCW from x̂₂)</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            Placing these as <strong style={{ color: '#e2e8f0' }}>columns</strong> of a matrix gives R(θ):
          </p>
          <p style={{ fontFamily: 'monospace', marginTop: 6, color: '#e2e8f0' }}>
            R(θ) = [[cos θ, -sin θ], [sin θ, cos θ]]
          </p>
          <p style={{ marginTop: 8 }}>
            This matrix rotates any vector by θ CCW, and its columns always tell you where Frame 2's axes point in Frame 1.
          </p>
        </div>
      </details>

      {/* ── Matrix Operations & Order ─────────────────────────────────────── */}
      <div style={{ marginTop: 40, borderTop: '1px solid #1e293b', paddingTop: 32 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
          Matrix Operations &amp; Order
        </h3>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 20 }}>
          Rotation matrices are multiplied together to chain rotations, but the order you multiply
          them in matters — matrix multiplication is not commutative.
        </p>

        {/* Non-commutativity callout */}
        <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, marginBottom: 20, border: '1px solid #334155' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 10, letterSpacing: 0.3 }}>
            ORDER MATTERS — R<sub>A</sub> · R<sub>B</sub> ≠ R<sub>B</sub> · R<sub>A</sub> in general
          </p>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 16 }}>
            Consider rotating the vector <span style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>v = [1, 0, 0]</span> by
            two 90° rotations in different orders:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            <div style={{ flex: '1 1 200px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', marginBottom: 6 }}>
                R<sub>z</sub>(90°) first, then R<sub>x</sub>(90°):
              </p>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8', lineHeight: 2 }}>
                <div>v → R<sub>z</sub>(90°)·v = [0, 1, 0]</div>
                <div>  → R<sub>x</sub>(90°)·[0,1,0] = [0, 0, 1]</div>
                <div style={{ color: '#3b82f6', fontWeight: 600 }}>Result: [0, 0, 1]</div>
              </div>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 6 }}>
                R<sub>x</sub>(90°) first, then R<sub>z</sub>(90°):
              </p>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8', lineHeight: 2 }}>
                <div>v → R<sub>x</sub>(90°)·v = [1, 0, 0]</div>
                <div>  → R<sub>z</sub>(90°)·[1,0,0] = [0, 1, 0]</div>
                <div style={{ color: '#a78bfa', fontWeight: 600 }}>Result: [0, 1, 0]</div>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#475569', marginTop: 14, lineHeight: 1.6 }}>
            Same two rotations, different order — completely different final orientation. This is why
            the sequence of rotations is always explicitly specified in aerospace and robotics.
          </p>
        </div>

        <div style={{ background: '#0f172a', borderRadius: 8, padding: 16, border: '1px solid #1e293b', fontSize: 13, color: '#64748b', lineHeight: 1.9 }}>
          <p style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 8 }}>Reading a chain of rotations</p>
          <p>
            When you write <span style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>R<sub>C</sub> · R<sub>B</sub> · R<sub>A</sub></span>,
            the rotation <em>applied first</em> is the rightmost one (R<sub>A</sub>), working left toward R<sub>C</sub>.
            A vector <span style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>v</span> is transformed as:
          </p>
          <p style={{ fontFamily: 'monospace', color: '#e2e8f0', marginTop: 6, marginBottom: 6 }}>
            v′ = R<sub>C</sub> · (R<sub>B</sub> · (R<sub>A</sub> · v))
          </p>
          <p>
            <span style={{ color: '#fbbf24' }}>Exception:</span> rotations about the <em>same axis</em> commute —
            R<sub>z</sub>(α) · R<sub>z</sub>(β) = R<sub>z</sub>(β) · R<sub>z</sub>(α) = R<sub>z</sub>(α+β).
          </p>
        </div>
      </div>

      {/* ── Properties of Rotation Matrices ──────────────────────────────── */}
      <div style={{ marginTop: 40, borderTop: '1px solid #1e293b', paddingTop: 32 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
          Properties of Rotation Matrices
        </h3>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 20 }}>
          Every proper rotation matrix satisfies the following properties — these are not just
          coincidences, they follow directly from what a rotation does geometrically.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {[
            {
              title: 'Determinant = +1',
              color: '#3b82f6',
              body: <>
                det(R) = +1 always. The determinant measures how a matrix scales volume — a rotation
                preserves shape and handedness, so the volume scale is exactly 1. A det of −1
                would indicate a <em>reflection</em>, not a pure rotation.
              </>
            },
            {
              title: 'Columns (and rows) are orthonormal',
              color: '#a78bfa',
              body: <>
                Each column of R is a unit vector, and any two columns are perpendicular.
                The same holds for rows. This makes sense because the columns are the rotated
                coordinate axes — unit vectors that remain mutually perpendicular after rotation.
              </>
            },
            {
              title: <>R<sup>T</sup> = R<sup>−1</sup></>,
              color: '#22d3ee',
              body: <>
                Transposing a rotation matrix gives its inverse. This means undoing a rotation
                costs no extra computation — just transpose. It also means
                R · R<sup>T</sup> = R<sup>T</sup> · R = I.
              </>
            },
            {
              title: 'Preserves lengths and angles',
              color: '#22c55e',
              body: <>
                For any vectors <strong>u</strong> and <strong>v</strong>:
                &nbsp;|Ru| = |u| and (Ru)·(Rv) = u·v. Rotations are isometries — they move
                vectors without stretching or shearing them, keeping dot products and therefore
                angles intact.
              </>
            },
          ].map(({ title, color, body }) => (
            <div key={color} style={{
              background: '#1e293b', borderRadius: 10, padding: 18,
              border: '1px solid #334155', borderLeft: `3px solid ${color}`
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 6 }}>{title}</p>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, margin: 0 }}>{body}</p>
            </div>
          ))}

        </div>
      </div>

      {/* ── Orthogonal Matrices ───────────────────────────────────────────── */}
      <div style={{ marginTop: 40, borderTop: '1px solid #1e293b', paddingTop: 32, marginBottom: 16 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
          Orthogonal Matrices
        </h3>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 20 }}>
          Rotation matrices belong to a broader family called <em>orthogonal matrices</em>.
          Understanding this family clarifies why rotation matrices have the properties they do.
        </p>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>Definition</p>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 10 }}>
            A square matrix Q is <strong style={{ color: '#e2e8f0' }}>orthogonal</strong> if:
          </p>
          <p style={{ fontFamily: 'monospace', fontSize: 14, color: '#fbbf24', marginBottom: 10, paddingLeft: 16 }}>
            Q<sup>T</sup> · Q = Q · Q<sup>T</sup> = I
          </p>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>
            This is equivalent to saying Q<sup>−1</sup> = Q<sup>T</sup>, or that the columns of Q
            form an orthonormal basis.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
          <div style={{ flex: '1 1 220px', background: '#14532d22', border: '1px solid #22c55e44', borderRadius: 10, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', marginBottom: 6 }}>Rotation — det = +1</p>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
              Orthogonal matrix with det(Q) = +1. Preserves handedness (right-hand stays right-hand).
              These form the group <strong style={{ color: '#e2e8f0' }}>SO(n)</strong> — Special Orthogonal group.
              In 3D: SO(3).
            </p>
          </div>
          <div style={{ flex: '1 1 220px', background: '#7f1d1d22', border: '1px solid #ef444444', borderRadius: 10, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>Reflection — det = −1</p>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
              Orthogonal matrix with det(Q) = −1. Flips handedness (a mirror image).
              These are also isometries but cannot be achieved by physical rotation alone.
            </p>
          </div>
        </div>

        <div style={{ background: '#1e293b', borderRadius: 10, padding: 18, border: '1px solid #334155', fontSize: 13, color: '#64748b', lineHeight: 1.9 }}>
          <p style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 8 }}>The practical payoff</p>
          <ul style={{ marginLeft: 16, marginBottom: 0 }}>
            <li>
              <strong style={{ color: '#94a3b8' }}>Cheap inverse:</strong> R<sup>−1</sup> = R<sup>T</sup>.
              Transposing is trivial; inverting a general matrix requires Gaussian elimination.
            </li>
            <li>
              <strong style={{ color: '#94a3b8' }}>Numerical stability check:</strong> if you compose many
              rotation matrices and the result drifts from orthogonality (det ≠ 1, columns not unit),
              floating-point error has accumulated — the matrix should be re-orthogonalized.
            </li>
            <li>
              <strong style={{ color: '#94a3b8' }}>Group closure:</strong> the product of two rotation matrices
              is always another rotation matrix. You can chain any number of rotations and the result
              remains a valid rotation.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
