import { useCallback, useState } from "react"
import type { View } from "@/lib/notebook"

const KEY = "tb-view-mode"

function stored(): View | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === "notebook" || v === "report" ? v : null
  } catch {
    return null
  }
}

/** Explicit viewer choice (localStorage) > notebook `view:` front matter > live ? notebook : report. */
export function useViewMode(docView: View | undefined, live: boolean) {
  const [choice, setChoice] = useState<View | null>(stored)
  const setView = useCallback((v: View) => {
    try {
      localStorage.setItem(KEY, v)
    } catch {
      // storage blocked: choice still applies for this page view
    }
    setChoice(v)
  }, [])
  return [choice ?? docView ?? (live ? "notebook" : "report"), setView] as const
}
