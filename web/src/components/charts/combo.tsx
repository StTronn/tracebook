import { useMemo } from "react"
import { areaY, barY, defineChart, dot, group, lineY } from "@tanstack/charts"
import { Chart } from "@tanstack/charts/react"
import type { ChartBlock, Series } from "@/types"
import type { Variant } from "./spec"
import {
  bandScale, categoryAxis, nonNull, pick, Plot, rowKey, seriesColor, seriesKey, seriesLegend, smooth, tip, toRows,
  valueAxis, zeroDomain, type ViewProps,
} from "./common"
import { UnknownVariant } from "./unknown-variant"

const variants = { default: {} } satisfies Record<Variant<"combo">, object>
type Mark = NonNullable<Series["mark"]>

function build(block: ChartBlock) {
  const is = (m: Mark) => (k: number) => (block.series[k]?.mark ?? "line") === m
  const rows = (m: Mark) => toRows(block, is(m))
  const barKeys = block.series.flatMap((s, k) => ((s.mark ?? "line") === "bar" ? [seriesKey(k)] : []))
  const paint = { z: "k", color: "k", key: rowKey } as const
  // Draw order: bar → band → area → line → dot, so thin marks stay on top. One shared y scale (Python enforces one format).
  const marks = {
    band: areaY(rows("band"), { ...paint, x: "x", y1: "v", y2: "v2", fillOpacity: 0.3 }),
    area: areaY(rows("area"), { ...paint, x: "x", y1: 0, y2: "v", curve: smooth, fillOpacity: 0.3 }),
    bar: barY(rows("bar").filter(nonNull), { ...paint, x: "x", y: "v", layout: group({ scale: bandScale(barKeys.length ? barKeys : ["_"], 0.1) }) }),
    line: lineY(rows("line"), { ...paint, x: "x", y: "v", curve: smooth, strokeWidth: 2 }),
    dot: dot(rows("dot").filter(nonNull), { ...paint, x: "x", y: "v", r: 3.5 }),
  } satisfies Record<Mark, unknown>
  return defineChart(
    {
      marks: [marks.bar, marks.band, marks.area, marks.line, marks.dot],
      scales: { x: { scale: bandScale(block.labels ?? []), axis: categoryAxis(14) }, y: valueAxis(block.format, { domain: zeroDomain(block) }) },
      color: seriesColor(block),
    },
    { focus: "group-x", tooltip: tip },
  )
}

export function ComboChart({ block }: ViewProps) {
  const o = pick(variants, block.variant)
  const definition = useMemo(() => (o ? build(block) : null), [block, o])
  if (!definition) return <UnknownVariant block={block} />
  return (
    <Plot legend={seriesLegend(block)}>
      <Chart definition={definition} height={280} ariaLabel={block.title ?? "combo chart"} />
    </Plot>
  )
}
