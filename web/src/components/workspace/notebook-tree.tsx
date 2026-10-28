import { ChevronRightIcon, FolderIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { notebookHref } from "@/hooks/use-hash-route"
import { cn } from "@/lib/utils"
import type { NotebookEntry } from "@/types"

export type Folder = { name: string; path: string; folders: Folder[]; notebooks: NotebookEntry[] }

const leaf = (key: string) => key.slice(key.lastIndexOf("/") + 1)
export const entryLabel = (n: NotebookEntry) => n.title || leaf(n.key)

/** Folder tree from notebook keys ("a/b/c" → folders a, a/b); folders first, both sorted by name. */
export function buildTree(notebooks: NotebookEntry[]): { root: Folder; folders: string[] } {
  const root: Folder = { name: "", path: "", folders: [], notebooks: [] }
  const index = new Map<string, Folder>([["", root]])
  for (const nb of notebooks) {
    const parts = nb.key.split("/")
    let cur = root
    for (let i = 0; i < parts.length - 1; i++) {
      const path = parts.slice(0, i + 1).join("/")
      let f = index.get(path)
      if (!f) {
        f = { name: parts[i], path, folders: [], notebooks: [] }
        index.set(path, f)
        cur.folders.push(f)
      }
      cur = f
    }
    cur.notebooks.push(nb)
  }
  const cmp = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true })
  for (const f of index.values()) {
    f.folders.sort((a, b) => cmp(a.name, b.name))
    f.notebooks.sort((a, b) => cmp(entryLabel(a), entryLabel(b)) || cmp(a.key, b.key))
  }
  return { root, folders: [...index.keys()].filter(Boolean).sort(cmp) }
}

export function StatusDot({ nb }: { nb: NotebookEntry }) {
  const [cls, text] = !nb.ran
    ? ["border border-muted-foreground", "not run"]
    : nb.ok
      ? ["bg-success", nb.warnings ? `ok · ${nb.warnings} warning${nb.warnings === 1 ? "" : "s"}` : "ok"]
      : ["bg-destructive", `${nb.errors} error${nb.errors === 1 ? "" : "s"}`]
  return (
    <span className="ml-auto flex shrink-0 items-center gap-1" title={text}>
      {nb.ran && !nb.ok && nb.errors ? <span className="text-[10px] text-destructive">{nb.errors}</span> : null}
      <span className={cn("size-1.5 rounded-full", cls)} />
      <span className="sr-only">{text}</span>
    </span>
  )
}

const pad = (depth: number) => ({ paddingLeft: `${0.5 + depth * 0.75}rem` })

type Props = { root: Folder; current: string | null; onNavigate?: () => void }

export function NotebookTree({ root, current, onNavigate }: Props) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set())
  // reveal the current notebook when it changes (e.g. opened from the data browser)
  const [seen, setSeen] = useState(current)
  if (seen !== current) {
    setSeen(current)
    if (current && [...collapsed].some((p) => current.startsWith(p + "/"))) setCollapsed(new Set([...collapsed].filter((p) => !current.startsWith(p + "/"))))
  }
  const setOpen = (path: string, open: boolean) =>
    setCollapsed((c) => {
      const n = new Set(c)
      if (open) n.delete(path)
      else n.add(path)
      return n
    })

  const renderFolder = (f: Folder, depth: number) => (
    <>
      {f.folders.map((sub) => {
        const open = !collapsed.has(sub.path)
        return (
          <Collapsible key={`d:${sub.path}`} open={open} onOpenChange={(o) => setOpen(sub.path, o)}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="xs" className="w-full min-w-0 justify-start font-normal text-muted-foreground" style={pad(depth)}>
                <ChevronRightIcon className={cn("transition-transform", open && "rotate-90")} />
                <FolderIcon />
                <span className="truncate">{sub.name}</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>{renderFolder(sub, depth + 1)}</CollapsibleContent>
          </Collapsible>
        )
      })}
      {f.notebooks.map((nb) => {
        const active = nb.key === current
        return (
          <Button
            key={`n:${nb.key}`}
            asChild
            variant="ghost"
            size="xs"
            className={cn("w-full min-w-0 justify-start font-normal", active && "bg-accent text-accent-foreground")}
            style={pad(depth + 1)}
          >
            <a href={notebookHref(nb.key)} aria-current={active ? "page" : undefined} title={nb.key} onClick={onNavigate}>
              <span className="truncate">{entryLabel(nb)}</span>
              <StatusDot nb={nb} />
            </a>
          </Button>
        )
      })}
    </>
  )

  if (!root.folders.length && !root.notebooks.length) return <p className="px-2 text-xs text-muted-foreground">No notebooks yet.</p>
  return <nav className="flex flex-col">{renderFolder(root, 0)}</nav>
}
