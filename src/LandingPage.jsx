export default function LandingPage({ onNavigate }) {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '48px 24px' }}>

      {/* Hero */}
      <div style={{ marginBottom: 48 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#f1f5f9', marginBottom: 12, lineHeight: 1.2 }}>
          Rotation Matrix Trainer
        </h1>
        <p style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.7, maxWidth: 560 }}>
          Build real intuition for how rotation matrices work — not by memorizing formulas,
          but by understanding where they come from geometrically.
        </p>
      </div>

      {/* Suggested path */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#475569', marginBottom: 20 }}>
          Suggested learning path
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Step 1 */}
          <div style={{
            background: '#1e293b', borderRadius: 12, padding: 24,
            border: '1px solid #334155', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, bottom: 0, width: 4,
              background: 'linear-gradient(180deg, #3b82f6, #6366f1)', borderRadius: '12px 0 0 12px'
            }} />
            <div style={{ paddingLeft: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#1d4ed8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0
                }}>1</span>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
                  Start here — 2D Frame Decomposition
                </h2>
              </div>
              <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>
                Before memorizing a 3D matrix, understand <em>why</em> the entries are cosines and sines.
                You'll be shown two coordinate frames at some angle θ and asked to express
                one frame's axes in terms of the other — dot product by dot product.
                Those components slot directly into the columns of the rotation matrix.
              </p>
              <ul style={{ fontSize: 13, color: '#64748b', lineHeight: 2, marginLeft: 16, marginBottom: 20 }}>
                <li>Interactive SVG diagram — see both frames and the angle between them</li>
                <li>Toggle projection lines to visualize cos θ and sin θ components</li>
                <li>Assemble R(θ) one column at a time from the geometry</li>
              </ul>
              <button
                onClick={() => onNavigate('decompose')}
                style={{
                  padding: '10px 24px', background: '#2563eb', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', letterSpacing: 0.3
                }}
              >
                Begin with 2D Decomposition →
              </button>
            </div>
          </div>

          {/* Connector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 20 }}>
            <div style={{ width: 1, height: 28, background: '#334155', marginLeft: 13 }} />
            <span style={{ fontSize: 12, color: '#475569' }}>then, when that feels solid</span>
          </div>

          {/* Step 2 */}
          <div style={{
            background: '#1e293b', borderRadius: 12, padding: 24,
            border: '1px solid #334155', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, bottom: 0, width: 4,
              background: 'linear-gradient(180deg, #8b5cf6, #a78bfa)', borderRadius: '12px 0 0 12px'
            }} />
            <div style={{ paddingLeft: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#7c3aed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0
                }}>2</span>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
                  Extend to 3D — Matrix Trainer
                </h2>
              </div>
              <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>
                Now apply the same geometric reasoning to the three principal rotation axes in 3D.
                Rx, Ry, and Rz each embed a 2D rotation in one plane while leaving the third axis fixed.
                Practice applying matrices to vectors, reading off individual entries, and composing rotations in sequence.
              </p>
              <ul style={{ fontSize: 13, color: '#64748b', lineHeight: 2, marginLeft: 16, marginBottom: 20 }}>
                <li><strong style={{ color: '#94a3b8' }}>Apply</strong> — compute where a vector lands after rotation</li>
                <li><strong style={{ color: '#94a3b8' }}>Identify</strong> — recognize a matrix by its structure</li>
                <li><strong style={{ color: '#94a3b8' }}>Entry</strong> — recall the value of a specific matrix cell</li>
                <li><strong style={{ color: '#94a3b8' }}>Composition</strong> — chain two rotations and find the result</li>
              </ul>
              <button
                onClick={() => onNavigate('trainer')}
                style={{
                  padding: '10px 24px', background: '#7c3aed', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', letterSpacing: 0.3
                }}
              >
                Go to 3D Trainer →
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Key insight callout */}
      <div style={{
        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10,
        padding: '18px 22px', fontSize: 13, color: '#64748b', lineHeight: 1.8
      }}>
        <span style={{ color: '#fbbf24', fontWeight: 700 }}>Key idea: </span>
        The columns of a rotation matrix are just the rotated coordinate axes expressed in the original frame.
        Once you can read that directly off a diagram, the matrix entries stop feeling arbitrary.
      </div>

    </div>
  )
}
