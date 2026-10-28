import { AlertTriangleIcon } from "lucide-react"
import { useNotebook } from "@/components/notebook/notebook-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { plural } from "@/lib/notebook"
import { cn } from "@/lib/utils"

/** `✗/⚠ <doc.path>:<line> CODE message`; rows with a block scroll to it. */
export function Diagnostics() {
  const { doc, scrollTo } = useNotebook()
  const ds = doc.diagnostics
  if (!ds.length) return null
  const errors = ds.filter((d) => d.severity === "error").length
  return (
    <Alert variant={errors ? "destructive" : "default"}>
      <AlertTriangleIcon />
      <AlertTitle>
        {plural(errors, "error")} · {plural(ds.length - errors, "warning")}
      </AlertTitle>
      <AlertDescription className="w-full">
        <ul className="flex w-full flex-col">
          {ds.map((d, i) => {
            const text = (
              <>
                <span className={cn("shrink-0", d.severity === "error" ? "text-destructive" : "text-warning")}>{d.severity === "error" ? "✗" : "⚠"}</span>
                <span className="shrink-0 text-muted-foreground">
                  {doc.path || "notebook.md"}:{d.line}
                </span>
                <span className="shrink-0 font-medium text-foreground">{d.code}</span>
                <span className="min-w-0 text-left break-words whitespace-normal text-foreground/90">{d.message}</span>
              </>
            )
            const block = d.block
            return (
              <li key={i} className="flex min-w-0 items-baseline gap-2 py-0.5 text-xs">
                {block ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-auto min-w-0 items-baseline justify-start gap-2 px-1 py-0.5 font-normal"
                    onClick={() => scrollTo(block)}
                  >
                    {text}
                  </Button>
                ) : (
                  <div className="flex min-w-0 items-baseline gap-2 px-1 py-0.5">{text}</div>
                )}
              </li>
            )
          })}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
