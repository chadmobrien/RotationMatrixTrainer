export default function LandingPage({ onNavigate }) {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '48px 24px' }}>

      {/* Hero */}
      <div style={{ marginBottom: 48 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#f1f5f9', marginBottom: 12, lineHeight: 1.2 }}>
          Coordinate Frames & Rotation Matrices
        </h1>
        <p style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.7 }}>
          Build real intuition for how coordinate frames relate to one another and how rotation
          matrices encode those relationships — starting with 2D geometry and building up through
          3D principal rotations to the real-world frames used in navigation and aerospace.
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
                Before jumping to 3D, understand <em>why</em> a rotation matrix is filled with cosines
                and sines. Given two coordinate frames separated by angle θ, you'll express each axis
                of one frame in terms of the other — dot product by dot product. Those projections
                are exactly the columns of the rotation matrix R(θ).
              </p>
              <ul style={{ fontSize: 13, color: '#64748b', lineHeight: 2, marginLeft: 16, marginBottom: 20 }}>
                <li>Interactive diagram showing both frames and the angle between them</li>
                <li>Toggle projection lines to visualize the cos θ and sin θ components</li>
                <li>Assemble R(θ) one column at a time directly from the geometry</li>
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
                  Extend to 3D — Principal Axis Rotations
                </h2>
              </div>
              <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>
                The same 2D logic extends to three dimensions. Rx, Ry, and Rz each embed a planar
                rotation in one coordinate plane while leaving the perpendicular axis unchanged.
                Practice identifying matrix structure, reading individual entries, applying rotations
                to vectors, and chaining multiple rotations in sequence — order matters.
              </p>
              <ul style={{ fontSize: 13, color: '#64748b', lineHeight: 2, marginLeft: 16, marginBottom: 20 }}>
                <li><strong style={{ color: '#94a3b8' }}>Apply</strong> — compute where a vector lands after a rotation</li>
                <li><strong style={{ color: '#94a3b8' }}>Identify</strong> — recognize a matrix by its structure and fixed axis</li>
                <li><strong style={{ color: '#94a3b8' }}>Entry</strong> — recall the value of a specific matrix element</li>
                <li><strong style={{ color: '#94a3b8' }}>Composition</strong> — chain two rotations and read off the result</li>
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

          {/* Connector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 20 }}>
            <div style={{ width: 1, height: 28, background: '#334155', marginLeft: 13 }} />
            <span style={{ fontSize: 12, color: '#475569' }}>then, see it applied to real-world frames</span>
          </div>

          {/* Step 3 */}
          <div style={{
            background: '#1e293b', borderRadius: 12, padding: 24,
            border: '1px solid #334155', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, bottom: 0, width: 4,
              background: 'linear-gradient(180deg, #0ea5e9, #22d3ee)', borderRadius: '12px 0 0 12px'
            }} />
            <div style={{ paddingLeft: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#0369a1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0
                }}>3</span>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
                  Reference Frames — ECEF and NED
                </h2>
              </div>
              <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>
                See how the rotation machinery from steps 1 and 2 underpins the coordinate frames
                used in GPS, inertial navigation, and aerospace. ECEF fixes a Cartesian frame to
                Earth's center. NED places a local frame on the surface at any latitude and longitude —
                reached from ECEF by two sequential elemental rotations.
              </p>
              <ul style={{ fontSize: 13, color: '#64748b', lineHeight: 2, marginLeft: 16, marginBottom: 20 }}>
                <li><strong style={{ color: '#94a3b8' }}>ECEF</strong> — Earth-Centered, Earth-Fixed: the global Cartesian baseline</li>
                <li><strong style={{ color: '#94a3b8' }}>NED</strong> — North, East, Down: a local tangent-plane frame at any surface point</li>
                <li>Longitude (λ) and latitude (φ) rotations connect the two frames</li>
              </ul>
              <button
                onClick={() => onNavigate('refframes')}
                style={{
                  padding: '10px 24px', background: '#0369a1', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', letterSpacing: 0.3
                }}
              >
                Explore Reference Frames →
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
        The columns of a rotation matrix are the rotated coordinate axes expressed in the original frame.
        Once you can read that off a diagram, the entries stop feeling arbitrary — and frames like ECEF
        and NED become natural consequences of applying a sequence of those rotations.
      </div>

    </div>
  )
}
