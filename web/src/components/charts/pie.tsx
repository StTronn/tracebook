import { useMemo } from "react"
import { defineChart } from "@tanstack/charts"
import { decorative } from "@tanstack/charts/mark/decorative"
import { pie, polar, radialArc, radialText } from "@tanstack/charts/polar"
import { Chart } from "@tanstack/charts/react"
import { scaleLinear } from "d3-scale"
import type { ChartBlock } from "@/types"
import type { Variant } from "./spec"
import { Centre, color, pick, Plot, tip, type Row, type ViewProps } from "./common"
import { UnknownVariant } from "./unknown-variant"

type Opts = { hole: number; total: boolean; labels: boolean }
const variants = {
  pie: { hole: 0, total: false, labels: false },
  donut: { hole: 0.6, total: false, labels: false },
  "donut-text": { hole: 0.62, total: true, labels: false },
  label: { hole: 0, total: false, labels: true },
} satisfies Record<Variant<"pie">, Opts>

const TAU = 2 * Math.PI

/** One slice per x label, in data order (Python guarantees non-negative values and a non-zero total). */
function slices(block: ChartBlock): Row[] {
  const s = block.series[0]
  return (block.labels ?? []).map((x, i) => ({ i, x, k: `p${i}`, name: s?.name ?? "", v: s?.values[i] ?? 0, v2: null, d: s?.display[i] ?? "—" }))
}

function build(block: ChartBlock, o: Opts) {
  const rows = slices(block)
  const arcs = pie(rows, { value: "v" })
  const ratio = o.labels ? 0.7 : 0.92
  const arcMark = polar({
    radiusRatio: ratio,
    scales: { angle: null, radius: null },
    marks: [
      radialArc(arcs, {
        key: "k", color: "k", stroke: "var(--card)", strokeWidth: 1,
        innerRadius: o.hole ? ({ radius }) => radius * o.hole : undefined,
      }),
    ],
  })
  // Value labels just outside each slice midpoint (slices < 4% unlabelled: they collide; tooltip/table still show them).
  const labelMark = decorative(
    polar({
      radiusRatio: ratio,
      scales: { angle: { scale: scaleLinear().domain([0, TAU]) }, radius: { scale: scaleLinear().domain([0, 1]) } },
      marks: [radialText(arcs.filter((a) => a.fraction >= 0.04), { angle: "angle", radius: () => 1, radiusOffset: 12, anchor: "outside", text: "d", fill: "var(--foreground)", fontSize: 11 })],
    }),
  )
  return defineChart(
    {
      marks: o.labels ? [arcMark, labelMark] : [arcMark],
      scales: { x: null, y: null },
      color: { domain: rows.map((r) => r.k), range: rows.map((_, i) => color(i)) },
      margin: 0,
    },
    { tooltip: tip },
  )
}

export function PieChart({ block }: ViewProps) {
  const o = pick(variants, block.variant)
  const definition = useMemo(() => (o ? build(block, o) : null), [block, o])
  if (!definition) return <UnknownVariant block={block} />
  const legend = (block.labels ?? []).map((label, i) => ({ label, color: color(i) }))
  const overlay = o?.total && block.total ? <Centre value={block.total} label="Total" /> : undefined
  return (
    <Plot legend={legend} overlay={overlay}>
      <Chart definition={definition} height={240} ariaLabel={block.title ?? "pie chart"} />
    </Plot>
  )
}
