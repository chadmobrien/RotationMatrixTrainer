// Safely evaluate a math expression that may contain sin/cos (in degrees).
// Accepts: digits, +, -, *, /, ^, parens, sin(...), cos(...), sqrt(...), pi
// Returns: number or NaN if invalid or unsafe.
export function evalExpr(str) {
  if (str === null || str === undefined) return NaN
  const s = str.trim()
  if (s === '') return NaN

  // Whitelist the raw input before any substitution
  // Allowed chars: digits, space, operators, parens, dot, trig word chars, degree symbol
  if (!/^[\d\s+\-*/^.()sincosqrtpie°]+$/i.test(s)) return NaN

  const js = s
    .toLowerCase()
    .replace(/°/g, '')
    // Replace trig with degree-aware Math calls (non-nested args only)
    .replace(/cos\s*\(\s*([^()]*?)\s*\)/g, (_, a) => `(Math.cos((${a})*Math.PI/180))`)
    .replace(/sin\s*\(\s*([^()]*?)\s*\)/g, (_, a) => `(Math.sin((${a})*Math.PI/180))`)
    .replace(/sqrt\s*\(\s*([^()]*?)\s*\)/g, (_, a) => `(Math.sqrt(${a}))`)
    .replace(/\bpi\b/g, 'Math.PI')
    .replace(/\^/g, '**')

  try {
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + js + ')')()
    return typeof result === 'number' ? result : NaN
  } catch {
    return NaN
  }
}

/** Check if two numeric values are within tolerance */
export function nearlyEqual(a, b, tol = 0.001) {
  return Math.abs(a - b) < tol
}
