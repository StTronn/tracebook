import { useMemo } from "react"
import { defineChart } from "@tanstack/charts"
import { decorative } from "@tanstack/charts/mark/decorative"
import { polar, radialArc } from "@tanstack/charts/polar"
import { Chart } from "@tanstack/charts/react"
import type { ChartBlock } from "@/types"
import type { Variant } from "./spec"
import { Centre, color, pick, Plot, tip, type ViewProps } from "./common"
import { UnknownVariant } from "./unknown-variant"

const variants = { default: { text: false }, text: { text: true } } satisfies Record<Variant<"radial">, { text: boolean }>

const TAU = 2 * Math.PI
const ring = { innerRadius: ({ radius }: { radius: number }) => radius * 0.8 }

function build(block: ChartBlock) {
  const s = block.series[0]
  const v = s?.values[0] ?? 0
  // Ring fill = value / max, clamped to [0, 1] (Python warns when value > max).
  const frac = Math.min(Math.max(block.max ? v / block.max : 0, 0), 1)
  const row = { i: 0, x: "", k: "s0", name: s?.name ?? "", v, v2: null, d: s?.display[0] ?? "—", startAngle: 0, endAngle: frac * TAU }
  return defineChart(
    {
      marks: [
        decorative(polar({ radiusRatio: 0.92, scales: { angle: null, radius: null }, marks: [radialArc([{ id: "track", startAngle: 0, endAngle: TAU }], { ...ring, fill: "var(--muted)" })] })),
        polar({ radiusRatio: 0.92, scales: { angle: null, radius: null }, marks: [radialArc([row], { ...ring, key: "k", fill: color(0) })] }),
      ],
      scales: { x: null, y: null },
      margin: 0,
    },
    { tooltip: tip },
  )
}

export function RadialChart({ block }: ViewProps) {
  const o = pick(variants, block.variant)
  const definition = useMemo(() => (o ? build(block) : null), [block, o])
  if (!definition) return <UnknownVariant block={block} />
  const s = block.series[0]
  const overlay = o?.text && s ? <Centre value={s.display[0] ?? "—"} label={s.name} /> : undefined
  return (
    <Plot overlay={overlay}>
      <Chart definition={definition} height={240} ariaLabel={block.title ?? "radial chart"} />
    </Plot>
  )
}
