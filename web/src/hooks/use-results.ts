import { useEffect, useState } from "react"
import { embedded, useLive } from "@/app/live-context"
import type { Doc } from "@/types"

export type Results = {
  /** Last good results of `key`; null until loaded, or when the notebook has not run yet. */
  doc: Doc | null
  /** true once a response for `key` arrived (doc may still be null = not run yet). */
  loaded: boolean
  /** Fetch error for `key`, else this notebook's run crash, else a workspace-wide error; the last good doc stays visible. */
  error: string | null
  /** true = dev server; false = exported file (embedded doc, `key` ignored). */
  live: boolean
}

type State = { key: string | null; doc: Doc | null; loaded: boolean; error: string | null }

/** Fetches `/results.json?nb=<key>` on key change and on every live version bump. Aborts stale requests. */
export function useResults(key: string | null): Results {
  const { live, version, error: liveError, errors } = useLive()
  const [s, setS] = useState<State>({ key: null, doc: null, loaded: false, error: null })

  useEffect(() => {
    if (embedded || key === null) return
    const ctl = new AbortController()
    fetch(`/results.json?nb=${encodeURIComponent(key)}`, { cache: "no-store", signal: ctl.signal })
      .then(async (r) => {
        const body = await r.json().catch(() => null)
        if (!r.ok) throw new Error(body?.error ?? `GET /results.json: HTTP ${r.status}`)
        return body as Doc | null
      })
      .then(
        (doc) => !ctl.signal.aborted && setS({ key, doc, loaded: true, error: null }),
        (e) => {
          if (ctl.signal.aborted) return
          const error = e instanceof Error ? e.message : String(e)
          setS((p) => (p.key === key ? { ...p, loaded: true, error } : { key, doc: null, loaded: true, error }))
        },
      )
    return () => ctl.abort()
  }, [key, version])

  if (embedded) return { doc: embedded, loaded: true, error: null, live: false }
  const cur = s.key === key ? s : { doc: null, loaded: false, error: null }
  return { doc: cur.doc, loaded: cur.loaded, error: cur.error ?? (key ? errors[key] : undefined) ?? liveError, live }
}
