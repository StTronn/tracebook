// Axis tick labels only. Every value shown as data comes pre-formatted from Python (display / total / share).
const en = (max: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: max })
const INT = en(0)
const NUM = en(2)
const PCT = en(1)
const INR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 })
const SHORT: readonly [number, string][] = [[1e7, "Cr"], [1e5, "L"], [1e3, "K"]]

const sign = (v: number, unit: string) => (v < 0 ? "-" : "") + unit

function inrShort(v: number): string {
  const a = Math.abs(v)
  const hit = SHORT.find(([size]) => a >= size)
  return sign(v, "₹") + (hit ? NUM.format(a / hit[0]) + hit[1] : INT.format(a))
}

/** Tick formatter for `block.format` (int num pct inr inr_short usd; anything else → plain number). */
export function tickFormat(format: string | null | undefined): (v: number) => string {
  switch (format) {
    case "int": return (v) => INT.format(v)
    case "pct": return (v) => `${PCT.format(v * 100)}%`
    case "inr": return (v) => sign(v, "₹") + INR.format(Math.abs(v))
    case "inr_short": return inrShort
    case "usd": return (v) => sign(v, "$") + NUM.format(Math.abs(v))
    default: return (v) => NUM.format(v)
  }
}

/** Shorten a long category tick; the full label stays in the tooltip and the Table tab. */
export const clip = (n: number) => (s: string) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
