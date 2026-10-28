import { useMemo } from "react"
import { areaY, defineChart, lineY, type ChartCurve } from "@tanstack/charts"
import { Chart } from "@tanstack/charts/react"
import type { ChartBlock } from "@/types"
import type { Variant } from "./spec"
import {
  categoryAxis, color, pick, Plot, pointScale, rowKey, seriesColor, seriesKey, seriesLegend, smooth, step, tip, toRows,
  valueAxis, type Row, type ViewProps,
} from "./common"
import { UnknownVariant } from "./unknown-variant"

type Opts = { curve?: ChartCurve; gradient: boolean; expanded: boolean }
const variants = {
  default: { curve: smooth, gradient: false, expanded: false },
  gradient: { curve: smooth, gradient: true, expanded: false },
  stacked: { curve: smooth, gradient: false, expanded: false },
  expanded: { curve: smooth, gradient: false, expanded: true },
  linear: { gradient: false, expanded: false },
  step: { curve: step, gradient: false, expanded: false },
} satisfies Record<Variant<"area">, Opts>

const gradientId = (k: string) => `tb-area-${k}`

type Stacked = Row & { y1: number | null; y2: number | null }
/** Diverging stack in series order (expanded: ÷ per-x Σ|v|). A null value leaves a gap in its own layer and adds 0 below
 *  the layers above it. Explicit y1/y2 (not TanStack's implicit stack) so a separate top-edge line can be drawn. */
function stackRows(block: ChartBlock, expanded: boolean): Stacked[] {
  const rows = toRows(block)
  const n = block.labels?.length ?? 0
  const pos = new Array<number>(n).fill(0), neg = new Array<number>(n).fill(0), tot = new Array<number>(n).fill(0)
  for (const r of rows) tot[r.i] += Math.abs(r.v ?? 0)
  return rows.map((r) => {
    if (r.v === null || (expanded && !tot[r.i])) return { ...r, y1: null, y2: null }
    const v = expanded ? r.v / tot[r.i] : r.v
    const acc = v < 0 ? neg : pos
    const y1 = acc[r.i]
    acc[r.i] += v
    return { ...r, y1, y2: acc[r.i] }
  })
}

function build(block: ChartBlock, o: Opts) {
  const keys = block.series.map((_, k) => seriesKey(k))
  const data = stackRows(block, o.expanded)
  const paint = { x: "x", z: "k", color: "k", key: rowKey, curve: o.curve } as const
  return defineChart(
    {
      marks: [
        areaY(data, {
          ...paint, y1: "y1", y2: "y2",
          ...(o.gradient ? { fill: (r: Row) => `url(#${gradientId(r.k)})`, fillOpacity: 1 } : { fillOpacity: 0.3 }),
        }),
        lineY(data, { ...paint, y: "y2", strokeWidth: 1.5 }),
      ],
      scales: {
        x: { scale: pointScale(block.labels ?? []), axis: categoryAxis(14) },
        y: valueAxis(o.expanded ? "pct" : block.format, o.expanded ? { domain: [0, 1] } : {}),
      },
      color: seriesColor(block),
      gradients: o.gradient
        ? keys.map((k, i) => ({
            id: gradientId(k), x1: 0, y1: 1, x2: 0, y2: 0,
            stops: [{ offset: 0, color: color(i), opacity: 0.05 }, { offset: 1, color: color(i), opacity: 0.7 }],
          }))
        : undefined,
    },
    { focus: "group-x", tooltip: tip },
  )
}

export function AreaChart({ block }: ViewProps) {
  const o = pick(variants, block.variant)
  const definition = useMemo(() => (o ? build(block, o) : null), [block, o])
  if (!definition) return <UnknownVariant block={block} />
  return (
    <Plot legend={seriesLegend(block)}>
      <Chart definition={definition} height={280} ariaLabel={block.title ?? "area chart"} />
    </Plot>
  )
}
