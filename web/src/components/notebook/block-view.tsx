import { ChartCard } from "@/components/charts/chart-card"
import { BlockError } from "@/components/notebook/block-error"
import { ComputeCell } from "@/components/notebook/compute-cell"
import { KpiGrid } from "@/components/notebook/kpi-block"
import { useNotebook } from "@/components/notebook/notebook-context"
import { Prose } from "@/components/notebook/prose"
import { TableView } from "@/components/notebook/table-block"
import { isVisible, type Item } from "@/lib/notebook"
import type { Block } from "@/types"

function Body({ block }: { block: Block }) {
  const { openTrace } = useNotebook()
  switch (block.kind) {
    case "sql":
    case "python":
    case "sheet":
      return <ComputeCell block={block} />
    case "kpi":
      return <KpiGrid block={block} />
    case "table":
      return <TableView block={block} />
    case "chart":
      // errored charts may lack series data → never hand them to the renderer
      return block.error ? <BlockError title={`Chart error · ${block.title ?? block.id}`} message={block.error} /> : <ChartCard block={block} onTrace={openTrace} />
    case "md":
      return null
  }
}

/** One section item; carries the `#cell-<id>` scroll target. */
export function ItemView({ item }: { item: Item }) {
  const { view } = useNotebook()
  if (item.type === "prose") {
    const anchor = item.anchor
    return (
      <div id={anchor ? `cell-${anchor}` : undefined} tabIndex={anchor ? -1 : undefined} className="flex scroll-mt-4 flex-col gap-2 outline-none">
        {anchor && item.block.error ? <BlockError title="Prose error" message={item.block.error} /> : null}
        {item.text ? <Prose text={item.text} /> : null}
      </div>
    )
  }
  if (!isVisible(item.block, view)) return null
  return (
    <div id={`cell-${item.block.id}`} tabIndex={-1} className="min-w-0 scroll-mt-4 outline-none">
      <Body block={item.block} />
    </div>
  )
}
