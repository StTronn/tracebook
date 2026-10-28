import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

// `version` bumps whenever the dev server reran something; data hooks refetch on change. live=false in exported files
// (no server, no workspace API). error: workspace-wide problem or "dev server unreachable"; errors: run crash per notebook key.
export type Live = { live: boolean; version: number; error: string | null; errors: Record<string, string> }
export const LiveContext = createContext<Live>({ live: false, version: 0, error: null, errors: {} })
export const useLive = () => useContext(LiveContext)

const POLL_MS = 1000
export const embedded = window.__TB_DATA__ ?? null

// Project theme.css → #tb-theme (dev only; export inlines it). Missing endpoint/file → no override.
// The build puts #tb-theme last in <head>; re-append anyway so it also beats styles Vite dev injects at runtime.
function applyTheme(css: string) {
  const el = document.getElementById("tb-theme")
  if (!el) return
  if (el.textContent !== css) el.textContent = css
  if (el !== document.head.lastElementChild) document.head.append(el)
}

/** The only /version poller. Theme is refetched before `version` is published, so consumers refetch after it. */
export function LiveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Live>({ live: !embedded, version: 0, error: null, errors: {} })

  useEffect(() => {
    if (embedded) return
    const ctl = new AbortController()
    let timer: number | undefined
    let seen: number | null = null
    const tick = async () => {
      try {
        const r = await fetch("/version", { cache: "no-store", signal: ctl.signal })
        if (!r.ok) throw new Error(`GET /version: HTTP ${r.status}`)
        const v: { version: number; error: string | null; errors?: Record<string, string> } = await r.json()
        if (v.version !== seen) {
          const t = await fetch("/theme.css", { cache: "no-store", signal: ctl.signal })
          const css = t.ok ? await t.text() : ""
          if (ctl.signal.aborted) return
          seen = v.version
          applyTheme(css)
        }
        setState((s) => (s.version === v.version && s.error === v.error ? s : { live: true, version: v.version, error: v.error, errors: v.errors ?? {} }))
      } catch (e) {
        if (ctl.signal.aborted) return
        const error = `dev server unreachable (${e instanceof Error ? e.message : String(e)})`
        setState((s) => (s.error === error ? s : { ...s, error }))
      }
      if (!ctl.signal.aborted) timer = window.setTimeout(tick, POLL_MS)
    }
    void tick()
    return () => {
      ctl.abort()
      window.clearTimeout(timer)
    }
  }, [])

  return <LiveContext value={state}>{children}</LiveContext>
}
