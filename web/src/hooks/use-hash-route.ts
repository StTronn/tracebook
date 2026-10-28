import { useCallback, useSyncExternalStore } from "react"

/** `#/n/<notebook key>` (key may contain "/"), `#/t/<table>`, anything else = home. */
export type Route = { kind: "notebook"; key: string } | { kind: "table"; table: string } | { kind: "home" }

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb)
  return () => window.removeEventListener("hashchange", cb)
}
const getHash = () => window.location.hash

function parse(hash: string): Route {
  const m = /^#\/([nt])\/(.+)$/.exec(hash)
  if (!m) return { kind: "home" }
  let rest: string
  try {
    rest = decodeURIComponent(m[2])
  } catch {
    return { kind: "home" }
  }
  return m[1] === "n" ? { kind: "notebook", key: rest } : { kind: "table", table: rest }
}

export const notebookHref = (key: string) => `#/n/${key.split("/").map(encodeURIComponent).join("/")}`
export const tableHref = (table: string) => `#/t/${encodeURIComponent(table)}`

/** Hash router: each navigation is a history entry, so back/forward work. */
export function useHashRoute() {
  const hash = useSyncExternalStore(subscribe, getHash)
  const navigate = useCallback((href: string) => {
    if (window.location.hash !== href) window.location.hash = href
  }, [])
  return { route: parse(hash), navigate }
}
