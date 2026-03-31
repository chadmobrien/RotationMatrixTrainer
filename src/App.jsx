import { useState, useEffect, useCallback } from 'react'
import DecompositionPage from './DecompositionPage.jsx'
import LandingPage from './LandingPage.jsx'
import ReferenceFramesPage from './ReferenceFramesPage.jsx'
import CalculatorsPage from './CalculatorsPage.jsx'
import { evalExpr, nearlyEqual } from './mathEval.js'

// ── helpers ────────────────────────────────────────────────────────────────────

const DEG = Math.PI / 180
const fmt = (n) => (Object.is(n, -0) ? '0' : n.toFixed(4).replace(/\.?0+$/, ''))

function rotX(a) {
  const c = Math.cos(a * DEG), s = Math.sin(a * DEG)
  return [[1,0,0],[0,c,-s],[0,s,c]]
}
function rotY(a) {
  const c = Math.cos(a * DEG), s = Math.sin(a * DEG)
  return [[c,0,s],[0,1,0],[-s,0,c]]
}
function rotZ(a) {
  const c = Math.cos(a * DEG), s = Math.sin(a * DEG)
  return [[c,-s,0],[s,c,0],[0,0,1]]
}

function mulMat(A, B) {
  return A.map((row, i) =>
    B[0].map((_, j) => row.reduce((sum, _, k) => sum + A[i][k] * B[k][j], 0))
  )
}

function applyMat(M, v) {
  return M.map(row => row.reduce((s, m, j) => s + m * v[j], 0))
}

const AXES = ['X', 'Y', 'Z']
const ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180, -30, -45, -60, -90]
const NICE = {
  0: '0', 30: '30°', 45: '45°', 60: '60°', 90: '90°',
  120: '120°', 135: '135°', 150: '150°', 180: '180°',
  '-30': '-30°', '-45': '-45°', '-60': '-60°', '-90': '-90°'
}

function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function buildMatrix(axis, angle) {
  if (axis === 'X') return rotX(angle)
  if (axis === 'Y') return rotY(angle)
  return rotZ(angle)
}

// ── question generators ────────────────────────────────────────────────────────

function genApplyQuestion() {
  const axis = randItem(AXES)
  const angle = randItem(ANGLES.filter(a => a !== 0))
  const M = buildMatrix(axis, angle)
  // use simple unit-like vectors
  const vecs = [[1,0,0],[0,1,0],[0,0,1],[1,1,0],[1,0,1],[0,1,1]]
  const v = randItem(vecs)
  const result = applyMat(M, v)
  return {
    type: 'apply',
    prompt: `Apply R_${axis}(${angle}°) to v = [${v.join(', ')}].\nWhat is the result vector? (round to 4 decimal places)`,
    answer: result.map(x => parseFloat(fmt(x))),
    meta: { axis, angle, v, M }
  }
}

function genIdentifyQuestion() {
  const axis = randItem(AXES)
  const angle = randItem(ANGLES.filter(a => a !== 0))
  const M = buildMatrix(axis, angle)
  const choices = AXES.map(a =>
    ANGLES.filter(ag => ag !== 0).map(ag => ({ axis: a, angle: ag }))
  ).flat().sort(() => Math.random() - 0.5).slice(0, 3)

  const correct = { axis, angle }
  if (!choices.find(c => c.axis === axis && c.angle === angle)) {
    choices[0] = correct
  }
  choices.sort(() => Math.random() - 0.5)

  return {
    type: 'identify',
    prompt: 'Which rotation does this matrix represent?',
    matrix: M,
    choices,
    correct,
  }
}

function genEntryQuestion() {
  const axis = randItem(AXES)
  const angle = randItem(ANGLES.filter(a => a !== 0))
  const M = buildMatrix(axis, angle)
  // pick a random non-trivial cell
  const cells = []
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      if (Math.abs(M[r][c]) > 0.001 && Math.abs(M[r][c]) < 0.999)
        cells.push([r, c])
  const [row, col] = cells.length ? randItem(cells) : [0, 1]
  const val = parseFloat(fmt(M[row][col]))
  return {
    type: 'entry',
    prompt: `For R_${axis}(${angle}°), what is the value of M[${row+1}][${col+1}] (row ${row+1}, col ${col+1})?`,
    answer: val,
    meta: { axis, angle, row, col, M }
  }
}

function genCompositionQuestion() {
  const a1 = randItem(AXES), ang1 = randItem([90, -90, 180])
  const a2 = randItem(AXES.filter(a => a !== a1)), ang2 = randItem([90, -90, 180])
  const M = mulMat(buildMatrix(a2, ang2), buildMatrix(a1, ang1))
  const v = randItem([[1,0,0],[0,1,0],[0,0,1]])
  const result = applyMat(M, v)
  return {
    type: 'composition',
    prompt: `Apply R_${a1}(${ang1}°) first, then R_${a2}(${ang2}°) to v = [${v.join(', ')}].\nWhat is the final vector?`,
    answer: result.map(x => parseFloat(fmt(x))),
    meta: { a1, ang1, a2, ang2, v }
  }
}

const GENERATORS = [genApplyQuestion, genIdentifyQuestion, genEntryQuestion, genCompositionQuestion]

function newQuestion() { return randItem(GENERATORS)() }

// ── UI components ──────────────────────────────────────────────────────────────

function MatrixDisplay({ M, highlight }) {
  return (
    <div style={{ display: 'inline-block', border: '2px solid #475569', borderRadius: 8, padding: '12px 16px', background: '#1e293b', fontFamily: 'monospace', fontSize: 15 }}>
      {M.map((row, r) => (
        <div key={r} style={{ display: 'flex', gap: 16 }}>
          {row.map((val, c) => (
            <span key={c} style={{
              width: 72, textAlign: 'right',
              color: highlight && highlight[0] === r && highlight[1] === c ? '#fbbf24' : '#94a3b8',
              fontWeight: highlight && highlight[0] === r && highlight[1] === c ? 700 : 400,
            }}>
              {fmt(val)}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

function VectorInput({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      {['x', 'y', 'z'].map((label, i) => (
        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>{label}:</span>
          <input
            type="text"
            value={value[i]}
            onChange={e => {
              const next = [...value]
              next[i] = e.target.value
              onChange(next)
            }}
            placeholder="e.g. cos(45)"
            style={{ width: 110, padding: '6px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 13, fontFamily: 'monospace' }}
          />
        </label>
      ))}
    </div>
  )
}

function ScoreBar({ score, total }) {
  const pct = total ? Math.round((score / total) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#22c55e', transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>{score}/{total} ({pct}%)</span>
    </div>
  )
}

// ── main ───────────────────────────────────────────────────────────────────────

function TrainerPage() {
  const [q, setQ] = useState(() => newQuestion())
  const [vecInput, setVecInput] = useState(['', '', ''])
  const [numInput, setNumInput] = useState('')
  const [choiceSelected, setChoiceSelected] = useState(null)
  const [result, setResult] = useState(null) // null | 'correct' | 'wrong'
  const [explanation, setExplanation] = useState('')
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [streak, setStreak] = useState(0)

  const resetInputs = useCallback(() => {
    setVecInput(['', '', ''])
    setNumInput('')
    setChoiceSelected(null)
    setResult(null)
    setExplanation('')
  }, [])

  const nextQuestion = useCallback(() => {
    resetInputs()
    setQ(newQuestion())
  }, [resetInputs])

  const checkAnswer = () => {
    if (result) return
    let correct = false
    let expl = ''

    if (q.type === 'apply' || q.type === 'composition') {
      const parsed = vecInput.map(evalExpr)
      correct = q.answer.every((a, i) => nearlyEqual(a, parsed[i]))
      expl = `Correct answer: [${q.answer.map(fmt).join(', ')}]`
      if (q.type === 'apply') {
        const { axis, angle, v } = q.meta
        expl += `\n\nR_${axis}(${angle}°) × [${v.join(', ')}]`
      } else {
        const { a1, ang1, a2, ang2, v } = q.meta
        expl += `\n\nFirst apply R_${a1}(${ang1}°), then R_${a2}(${ang2}°) to [${v.join(', ')}]`
      }
    } else if (q.type === 'entry') {
      const parsed = evalExpr(numInput)
      correct = nearlyEqual(parsed, q.answer)
      expl = `Correct answer: ${fmt(q.answer)}\n\nMatrix R_${q.meta.axis}(${q.meta.angle}°):`
    } else if (q.type === 'identify') {
      correct = choiceSelected &&
        choiceSelected.axis === q.correct.axis &&
        choiceSelected.angle === q.correct.angle
      expl = `Correct: R_${q.correct.axis}(${q.correct.angle}°)`
    }

    setResult(correct ? 'correct' : 'wrong')
    setExplanation(expl)
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
    setStreak(s => correct ? s + 1 : 0)
  }

  const handleKey = (e) => { if (e.key === 'Enter' && !result) checkAnswer() }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
          Rotation Matrix Trainer
        </h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>3D rotation matrices — R<sub>x</sub>, R<sub>y</sub>, R<sub>z</sub></p>
      </div>

      {/* Score */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>Score</span>
          {streak >= 3 && (
            <span style={{ fontSize: 13, color: '#f59e0b' }}>
              {streak} streak
            </span>
          )}
        </div>
        <ScoreBar score={score.correct} total={score.total} />
      </div>

      {/* Question card */}
      <div style={{
        background: '#1e293b', borderRadius: 12, padding: 24,
        border: result === 'correct' ? '1px solid #22c55e' : result === 'wrong' ? '1px solid #ef4444' : '1px solid #334155',
        transition: 'border-color 0.2s'
      }}>
        {/* Type badge */}
        <div style={{ marginBottom: 16 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase',
            color: '#64748b', background: '#0f172a', padding: '3px 8px', borderRadius: 4
          }}>
            {q.type === 'apply' ? 'Apply Matrix' :
             q.type === 'identify' ? 'Identify Rotation' :
             q.type === 'entry' ? 'Matrix Entry' : 'Composition'}
          </span>
        </div>

        {/* Prompt */}
        <pre style={{ fontFamily: 'inherit', fontSize: 15, color: '#cbd5e1', marginBottom: 20, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {q.prompt}
        </pre>

        {/* Matrix display for identify/entry questions */}
        {(q.type === 'identify' || q.type === 'entry') && (
          <div style={{ marginBottom: 20 }}>
            <MatrixDisplay
              M={q.type === 'identify' ? q.matrix : q.meta.M}
              highlight={q.type === 'entry' ? [q.meta.row, q.meta.col] : null}
            />
          </div>
        )}

        {/* Answer inputs */}
        {(q.type === 'apply' || q.type === 'composition') && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Your answer:</p>
            <VectorInput value={vecInput} onChange={setVecInput} />
          </div>
        )}

        {q.type === 'entry' && (
          <div style={{ marginBottom: 20 }}>
            <input
              type="text"
              value={numInput}
              onChange={e => setNumInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g. cos(45) or -sin(30)"
              style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 14, width: 220, fontFamily: 'monospace' }}
            />
          </div>
        )}

        {q.type === 'identify' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            {q.choices.map((c, i) => (
              <button
                key={i}
                onClick={() => !result && setChoiceSelected(c)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: '1px solid',
                  cursor: result ? 'default' : 'pointer', fontSize: 14, fontWeight: 500,
                  background: choiceSelected === c ? '#1d4ed8' : '#0f172a',
                  borderColor: result
                    ? (c.axis === q.correct.axis && c.angle === q.correct.angle ? '#22c55e'
                      : choiceSelected === c ? '#ef4444' : '#334155')
                    : choiceSelected === c ? '#3b82f6' : '#334155',
                  color: '#e2e8f0',
                  transition: 'all 0.15s'
                }}
              >
                R<sub>{c.axis}</sub>({c.angle}°)
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {!result && (
            <button
              onClick={checkAnswer}
              style={{
                padding: '10px 24px', background: '#2563eb', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Check
            </button>
          )}
          {result && (
            <button
              onClick={nextQuestion}
              style={{
                padding: '10px 24px',
                background: result === 'correct' ? '#16a34a' : '#dc2626',
                color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {result === 'correct' ? 'Next' : 'Try Another'}
            </button>
          )}
        </div>

        {/* Result feedback */}
        {result && (
          <div style={{
            marginTop: 20, padding: 16, borderRadius: 8,
            background: result === 'correct' ? '#14532d22' : '#7f1d1d22',
            border: `1px solid ${result === 'correct' ? '#22c55e44' : '#ef444444'}`
          }}>
            <div style={{ fontWeight: 700, color: result === 'correct' ? '#22c55e' : '#ef4444', marginBottom: 8, fontSize: 15 }}>
              {result === 'correct' ? 'Correct!' : 'Incorrect'}
            </div>
            <pre style={{ fontFamily: 'monospace', fontSize: 13, color: '#94a3b8', whiteSpace: 'pre-wrap', margin: 0 }}>
              {explanation}
            </pre>
            {result === 'wrong' && (q.type === 'entry' || q.type === 'identify') && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Full matrix:</p>
                <MatrixDisplay
                  M={q.type === 'entry' ? q.meta.M : q.matrix}
                  highlight={q.type === 'entry' ? [q.meta.row, q.meta.col] : null}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reference section */}
      <details style={{ marginTop: 24 }}>
        <summary style={{ cursor: 'pointer', color: '#64748b', fontSize: 14, userSelect: 'none' }}>
          Reference: Rotation Matrix Formulas
        </summary>
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {[
            { label: <>R<sub>x</sub>(θ)</>, key: 'Rx', M: rotX(45) },
            { label: <>R<sub>y</sub>(θ)</>, key: 'Ry', M: rotY(45) },
            { label: <>R<sub>z</sub>(θ)</>, key: 'Rz', M: rotZ(45) },
          ].map(({ label, key, M }) => (
            <div key={key}>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{label} (shown at θ=45°)</p>
              <MatrixDisplay M={M} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 12, color: '#64748b', lineHeight: 1.8 }}>
          <div>R<sub>x</sub>(θ) = [[1,0,0], [0,cos,-sin], [0,sin,cos]]</div>
          <div>R<sub>y</sub>(θ) = [[cos,0,sin], [0,1,0], [-sin,0,cos]]</div>
          <div>R<sub>z</sub>(θ) = [[cos,-sin,0], [sin,cos,0], [0,0,1]]</div>
        </div>
      </details>
    </div>
  )
}

// ── Tab shell ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'home',        label: 'Home' },
  { id: 'decompose',   label: 'Rotation Matrices' },
  { id: 'trainer',     label: '3D Matrix Trainer' },
  { id: 'refframes',   label: 'Reference Frames' },
  { id: 'calculators', label: 'Calculators' },
]

export default function App() {
  const [tab, setTab] = useState('home')
  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: '1px solid #1e293b',
        background: '#0a1120', padding: '0 24px'
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
              color: tab === t.id ? '#e2e8f0' : '#475569',
              borderBottom: tab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'color 0.15s'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Page content */}
      {tab === 'home'      && <LandingPage onNavigate={setTab} />}
      {tab === 'decompose' && <DecompositionPage />}
      {tab === 'trainer'   && <TrainerPage />}
      {tab === 'refframes'   && <ReferenceFramesPage />}
      {tab === 'calculators' && <CalculatorsPage />}
    </div>
  )
}
