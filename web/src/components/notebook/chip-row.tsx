import { CornerDownRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CopyRefButton } from "@/components/notebook/copy-ref-button"
import { useNotebook } from "@/components/notebook/notebook-context"
import { useComments } from "@/hooks/use-comments"
import { plural } from "@/lib/notebook"
import type { ComputeBlock } from "@/types"

/** `↳ id · N rows · used by a, b` + copy-ref, under a compute cell. */
export function ChipRow({ block }: { block: ComputeBlock }) {
  const { openTrace, scrollTo } = useNotebook()
  const open = useComments()
    .forBlock(block.id)
    .filter((c) => c.status === "open").length
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-1 pt-1 text-[11px] text-muted-foreground">
      <Button variant="ghost" size="xs" className="-ml-1.5 text-[11px] text-muted-foreground" onClick={() => openTrace(block.id)}>
        <CornerDownRightIcon />
        {block.id}
      </Button>
      {block.rowCount != null ? <span>· {plural(block.rowCount, "row")}</span> : null}
      {block.usedBy.length ? (
        <span className="flex flex-wrap items-center gap-x-1">
          · used by
          {block.usedBy.map((u) => (
            <Button key={u} variant="link" size="xs" className="h-5 px-0.5 text-[11px]" onClick={() => scrollTo(u)}>
              {u}
            </Button>
          ))}
        </span>
      ) : null}
      {block.outputs?.length ? <span>· outputs {block.outputs.join(", ")}</span> : null}
      {open ? (
        <Button variant="link" size="xs" className="h-5 px-0.5 text-[11px] text-warning" onClick={() => openTrace(block.id)}>
          · {plural(open, "open comment")}
        </Button>
      ) : null}
      <CopyRefButton block={block} />
    </div>
  )
}
