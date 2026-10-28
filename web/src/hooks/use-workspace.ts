import { useCallback, useEffect, useState } from "react"
import { useLive } from "@/app/live-context"
import type { Workspace } from "@/types"

async function fetchWorkspace(signal?: AbortSignal): Promise<Workspace> {
  const r = await fetch("/api/workspace", { cache: "no-store", signal })
  if (!r.ok) throw new Error(`GET /api/workspace: HTTP ${r.status}`)
  return r.json()
}

/** Dev only: /api/workspace, refetched on every live version bump (last good value kept on error).
 *  `refresh()` refetches now (e.g. right after creating a notebook, before navigating to it). */
export function useWorkspace() {
  const { live, version } = useLive()
  const [ws, setWs] = useState<Workspace | null>(null)

  useEffect(() => {
    if (!live) return
    const ctl = new AbortController()
    fetchWorkspace(ctl.signal).then(
      (w) => !ctl.signal.aborted && setWs(w),
      () => {}, // transient (server restarting): keep the last good workspace; /version surfaces the outage
    )
    return () => ctl.abort()
  }, [live, version])

  const refresh = useCallback(async () => setWs(await fetchWorkspace()), [])
  return { ws, refresh }
}
