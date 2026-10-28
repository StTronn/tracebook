import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotebook } from "@/components/notebook/notebook-context"
import { useCopy } from "@/hooks/use-copy"
import { copyRefText } from "@/lib/notebook"
import type { Block } from "@/types"

const LABEL = { idle: "Copy ref", copied: "Copied", failed: "Copy failed" } as const

/** Copies `@<id> (<doc.path>:<line>)` — paste into an agent prompt to point at this block. */
export function CopyRefButton({ block, withText = false }: { block: Block; withText?: boolean }) {
  const { status, copy } = useCopy()
  const [hover, setHover] = useState(false)
  const { doc } = useNotebook()
  const text = copyRefText(block, doc.path)
  return (
    <Tooltip open={hover || status !== "idle"} onOpenChange={setHover}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={withText ? "xs" : "icon-xs"}
          className="text-muted-foreground"
          aria-label={`Copy ${text}`}
          onClick={() => void copy(text)}
        >
          {status === "copied" ? <CheckIcon /> : <CopyIcon />}
          {withText ? "copy ref" : null}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{status === "idle" ? `${LABEL.idle} ${text}` : LABEL[status]}</TooltipContent>
    </Tooltip>
  )
}
