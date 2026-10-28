import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { SheetCell } from "@/types"

type Grid = { sheet: string; range: string; rows: SheetCell[][] }

const ADDR = /^([A-Z]+)(\d+)$/

/** Excel-like read-only grid: column letters / row numbers from cell addresses, fx bar for the selected cell. */
export function SheetGrid({ grid }: { grid: Grid }) {
  const [sel, setSel] = useState<string | null>(null)
  const cell = sel ? grid.rows.flat().find((c) => c.a === sel) : undefined
  const letters = (grid.rows[0] ?? []).map((c) => ADDR.exec(c.a)?.[1] ?? "")
  const [, selCol, selRow] = (cell && ADDR.exec(cell.a)) || []
  return (
    <div className="w-fit max-w-full min-w-0 border text-xs">
      <div className="flex min-w-72 items-center border-b bg-muted/40">
        <span className="w-20 shrink-0 border-r px-2 py-1 text-muted-foreground">{cell?.a ?? grid.range}</span>
        <span className="shrink-0 border-r px-2 py-1 text-muted-foreground italic">fx</span>
        <span className="min-w-0 flex-1 truncate px-2 py-1" title={cell ? (cell.f ?? cell.d) : undefined}>
          {cell ? (cell.f ?? cell.d) : null}
        </span>
      </div>
      <Table className="w-auto border-collapse text-xs tabular-nums">
        <TableHeader>
          <TableRow className="border-b hover:bg-transparent [&>th]:border-r">
            <TableHead className="h-6 w-10 bg-muted/40 px-1" />
            {letters.map((l, i) => (
              <TableHead key={i} className={cn("h-6 bg-muted/40 px-2 text-center font-normal text-muted-foreground", l === selCol && "text-primary")}>
                {l}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {grid.rows.map((row, ri) => {
            const n = ADDR.exec(row[0]?.a ?? "")?.[2] ?? String(ri + 1)
            return (
              <TableRow key={ri} className="border-b hover:bg-transparent [&>td]:border-r">
                <TableCell className={cn("w-10 bg-muted/40 px-1 py-1 text-center text-muted-foreground", n === selRow && "text-primary")}>{n}</TableCell>
                {row.map((c) => (
                  <TableCell
                    key={c.a}
                    tabIndex={0}
                    onFocus={() => setSel(c.a)}
                    title={c.f ?? undefined}
                    className={cn(
                      "relative min-w-24 cursor-cell px-2 py-1 outline-none",
                      typeof c.v === "number" && "text-right",
                      c.f && "bg-primary/5 after:absolute after:top-0 after:right-0 after:border-t-[5px] after:border-l-[5px] after:border-t-primary/70 after:border-l-transparent",
                      sel === c.a && "ring-1 ring-primary ring-inset",
                    )}
                  >
                    {c.d}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <div className="border-t bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
        <span className="border-x border-b-2 border-b-primary bg-background px-2 py-0.5 text-foreground">{grid.sheet}</span>
        <span className="pl-2">{grid.range}</span>
      </div>
    </div>
  )
}
