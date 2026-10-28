import { useMemo } from "react"
import { barX, defineChart, text } from "@tanstack/charts"
import { decorative } from "@tanstack/charts/mark/decorative"
import { Chart } from "@tanstack/charts/react"
import type { ChartBlock } from "@/types"
import type { Variant } from "./spec"
import { bandScale, categoryAxis, color, nonNull, pick, Plot, tip, toRows, valueAxis, type ViewProps } from "./common"
import { UnknownVariant } from "./unknown-variant"

const variants = { default: {} } satisfies Record<Variant<"funnel">, object>

function build(block: ChartBlock) {
  // Stage rows in data order; sub = Python's share of the first stage.
  const data = toRows(block, (k) => k === 0).map((r) => ({ ...r, sub: block.share?.[r.i] })).filter(nonNull)
  return defineChart(
    ({ width }) => ({
      marks: [
        barX(data, { x: "v", y: "x", key: "x", fill: color(0) }),
        decorative(text(data, { x: "v", y: "x", text: (r) => (r.sub ? `${r.d} · ${r.sub}` : r.d), anchor: "start", dx: 6, fill: "var(--foreground)", fontSize: 11 })),
      ],
      scales: {
        x: { ...valueAxis(block.format), axis: false },
        y: { scale: bandScale(block.labels ?? [], 0.15), axis: categoryAxis(width < 480 ? 12 : 26) },
      },
    }),
    { focus: "nearest-y", tooltip: tip },
  )
}

export function FunnelChart({ block }: ViewProps) {
  const o = pick(variants, block.variant)
  const definition = useMemo(() => (o ? build(block) : null), [block, o])
  if (!definition) return <UnknownVariant block={block} />
  return (
    <Plot>
      <Chart definition={definition} height={Math.max(160, (block.labels?.length ?? 0) * 36 + 20)} ariaLabel={block.title ?? "funnel chart"} />
    </Plot>
  )
}
