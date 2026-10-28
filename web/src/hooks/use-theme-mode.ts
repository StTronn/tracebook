import { useCallback, useState } from "react"

export type ThemeMode = "dark" | "light"

// index.html applies the stored mode to <html data-theme> before first paint; the DOM attribute is the source of truth.
export const THEME_STORAGE_KEY = "tb-theme-mode"

const current = (): ThemeMode => (document.documentElement.dataset.theme === "light" ? "light" : "dark")

export function useThemeMode() {
  const [mode, setModeState] = useState<ThemeMode>(current)

  const setMode = useCallback((m: ThemeMode) => {
    document.documentElement.dataset.theme = m
    try {
      localStorage.setItem(THEME_STORAGE_KEY, m)
    } catch {
      // storage blocked (private mode, file:// policies): mode still applies for this page view
    }
    setModeState(m)
  }, [])

  const toggle = useCallback(() => setMode(current() === "dark" ? "light" : "dark"), [setMode])

  return { mode, setMode, toggle }
}
