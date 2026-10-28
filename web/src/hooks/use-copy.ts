import { useCallback, useEffect, useRef, useState } from "react"
import { writeClipboard } from "@/lib/clipboard"

export type CopyStatus = "idle" | "copied" | "failed"

/** Copy text; status flips to copied/failed for `ms`, then back to idle. */
export function useCopy(ms = 1200) {
  const [status, setStatus] = useState<CopyStatus>("idle")
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const copy = useCallback(
    async (text: string) => {
      const ok = await writeClipboard(text)
      window.clearTimeout(timer.current)
      setStatus(ok ? "copied" : "failed")
      timer.current = window.setTimeout(() => setStatus("idle"), ms)
    },
    [ms],
  )
  return { status, copy }
}
