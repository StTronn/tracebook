import { useMemo } from "react"
import { barX, barY, defineChart, group, stack, text } from "@tanstack/charts"
import { decorative } from "@tanstack/charts/mark/decorative"
import { Chart } from "@tanstack/charts/react"
import type { ChartBlock } from "@/types"
import type { Variant } from "./spec"
import {
  bandScale, categoryAxis, nonNull, pick, Plot, rowKey, seriesColor, seriesKey, seriesLegend, tip, toRows, valueAxis,
  type ViewProps,
} from "./common"
import { UnknownVariant } from "./unknown-variant"

type Opts = { stacked: boolean; horizontal: boolean; labels: boolean }
const variants = {
  default: { stacked: false, horizontal: false, labels: false },
  stacked: { stacked: true, horizontal: false, labels: false },
  horizontal: { stacked: false, horizontal: true, labels: false },
  label: { stacked: false, horizontal: false, labels: true },
} satisfies Record<Variant<"bar">, Opts>

function build(block: ChartBlock, o: Opts) {
  const labels = block.labels ?? []
  const data = toRows(block).filter(nonNull)
  const keys = block.series.map((_, k) => seriesKey(k))
  const layout = o.stacked ? stack({ order: keys }) : group({ scale: bandScale(keys, 0.1) })
  const common = { z: "k", color: "k", key: rowKey, layout } as const
  const options = { focus: o.horizontal ? "group-y" : "group-x", tooltip: tip } as const
  if (o.horizontal)
    return defineChart(
      ({ width }) => ({
        marks: [barX(data, { ...common, x: "v", y: "x" })],
        scales: { x: valueAxis(block.format), y: { scale: bandScale(labels), axis: categoryAxis(width < 480 ? 12 : 26) } },
        color: seriesColor(block),
      }),
      options,
    )
  const marks = [barY(data, { ...common, x: "x", y: "v" })]
  const labelMark = decorative(
    text(data, { x: "x", y: "v", text: "d", dy: (r) => ((r.v ?? 0) < 0 ? 12 : -10), fill: "var(--foreground)", fontSize: 11 }),
  )
  return defineChart(
    {
      marks: o.labels ? [...marks, labelMark] : marks,
      scales: { x: { scale: bandScale(labels), axis: categoryAxis(14) }, y: valueAxis(block.format) },
      color: seriesColor(block),
    },
    options,
  )
}

export function BarChart({ block }: ViewProps) {
  const o = pick(variants, block.variant)
  const definition = useMemo(() => (o ? build(block, o) : null), [block, o])
  if (!definition) return <UnknownVariant block={block} />
  const n = block.labels?.length ?? 0
  const height = o?.horizontal ? Math.max(200, n * block.series.length * 18 + n * 10 + 40) : 280
  return (
    <Plot legend={seriesLegend(block)}>
      <Chart definition={definition} height={height} ariaLabel={block.title ?? `${block.type} chart`} />
    </Plot>
  )
}
