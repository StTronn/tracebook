import { useMemo } from "react"
import { defineChart, lineY, text, type ChartCurve } from "@tanstack/charts"
import { decorative } from "@tanstack/charts/mark/decorative"
import { Chart } from "@tanstack/charts/react"
import type { ChartBlock } from "@/types"
import type { Variant } from "./spec"
import {
  categoryAxis, nonNull, pick, Plot, pointScale, rowKey, seriesColor, seriesLegend, smooth, step, tip, toRows, valueAxis,
  zeroDomain, type ViewProps,
} from "./common"
import { UnknownVariant } from "./unknown-variant"

type Opts = { curve?: ChartCurve; points: boolean; labels: boolean }
const variants = {
  default: { curve: smooth, points: false, labels: false },
  dots: { curve: smooth, points: true, labels: false },
  linear: { points: false, labels: false },
  step: { curve: step, points: false, labels: false },
  label: { curve: smooth, points: true, labels: true },
} satisfies Record<Variant<"line">, Opts>

function build(block: ChartBlock, o: Opts) {
  const data = toRows(block)
  const line = lineY(data, { x: "x", y: "v", z: "k", color: "k", key: rowKey, curve: o.curve, points: o.points, strokeWidth: 2 })
  const labels = decorative(text(data.filter(nonNull), { x: "x", y: "v", text: "d", dy: -12, fill: "var(--foreground)", fontSize: 11 }))
  return defineChart(
    {
      marks: o.labels ? [line, labels] : [line],
      scales: { x: { scale: pointScale(block.labels ?? []), axis: categoryAxis(14) }, y: valueAxis(block.format, { domain: zeroDomain(block) }) },
      color: seriesColor(block),
    },
    { focus: "group-x", tooltip: tip },
  )
}

export function LineChart({ block }: ViewProps) {
  const o = pick(variants, block.variant)
  const definition = useMemo(() => (o ? build(block, o) : null), [block, o])
  if (!definition) return <UnknownVariant block={block} />
  return (
    <Plot legend={seriesLegend(block)}>
      <Chart definition={definition} height={280} ariaLabel={block.title ?? "line chart"} />
    </Plot>
  )
}
