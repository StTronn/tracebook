// Generative-UI registry: chart type → view. `satisfies Record<ChartType, …>` makes tsc fail when components.json gains or
// loses a type; each view's `satisfies Record<Variant<T>, …>` does the same per variant (see spec.ts for the types.ts check).
import type { ComponentType } from "react"
import { AreaChart } from "./area"
import { BarChart } from "./bar"
import { ComboChart } from "./combo"
import { pick, type ViewProps } from "./common"
import { FunnelChart } from "./funnel"
import { LineChart } from "./line"
import { PieChart } from "./pie"
import { RadialChart } from "./radial"
import type { ChartType } from "./spec"

export const registry = {
  bar: BarChart,
  line: LineChart,
  area: AreaChart,
  pie: PieChart,
  funnel: FunnelChart,
  radial: RadialChart,
  combo: ComboChart,
} satisfies Record<ChartType, ComponentType<ViewProps>>

/** Runtime guard: results.json may come from a newer Python than this viewer. */
export const viewFor = (type: string) => pick<ComponentType<ViewProps>>(registry, type)
