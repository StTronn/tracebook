import { renderInline, textOf } from "@/lib/markdown"
import type { Block, ComputeBlock, MdBlock } from "@/types"

export type View = "notebook" | "report"

/** A unit rendered in a section: a prose chunk of an md block, or any other block. `anchor` = owning block id when
 *  this is the block's first rendered piece (target of `#cell-<id>`). */
export type Item =
  | { type: "prose"; key: string; block: MdBlock; text: string; anchor?: string }
  | { type: "block"; key: string; block: Block }

export type Section = {
  key: string
  /** null = intro (content before the first heading; not collapsible). */
  heading: { level: number; html: string; text: string; anchor?: string } | null
  items: Item[]
}

const HEADING = /^(#{1,2})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/
const FENCE = /^ {0,3}(`{3,}|~{3,})/

type Chunk = { heading?: { level: number; text: string }; body: string }

/** Split md text at `#`/`##` lines outside fenced code; text before the first heading is a heading-less chunk. */
function splitMd(text: string): Chunk[] {
  const chunks: Chunk[] = [{ body: "" }]
  let fence: string | null = null
  for (const line of text.split("\n")) {
    const f = FENCE.exec(line)?.[1]
    if (f && (fence === null || (f[0] === fence[0] && f.length >= fence.length))) fence = fence === null ? f : null
    const h = fence === null ? HEADING.exec(line) : null
    if (h) chunks.push({ heading: { level: h[1].length, text: h[2] }, body: "" })
    else chunks[chunks.length - 1].body += line + "\n"
  }
  return chunks
}

/** md headings start sections; a section owns everything after it until the next heading. */
export function buildSections(blocks: Block[]): Section[] {
  const intro: Section = { key: "intro", heading: null, items: [] }
  const sections: Section[] = [intro]
  for (const b of blocks) {
    if (b.kind !== "md") {
      sections[sections.length - 1].items.push({ type: "block", key: b.id, block: b })
      continue
    }
    let anchor: string | undefined = b.id
    splitMd(b.text).forEach((c, i) => {
      if (c.heading) {
        const html = renderInline(c.heading.text)
        sections.push({ key: `sec-${sections.length}`, heading: { level: c.heading.level, html, text: textOf(html), anchor }, items: [] })
        anchor = undefined
      }
      if (c.body.trim()) {
        sections[sections.length - 1].items.push({ type: "prose", key: `${b.id}:${i}`, block: b, text: c.body, anchor })
        anchor = undefined
      }
    })
    // md with no renderable content still needs a scroll target (diagnostics may point at it)
    if (anchor) sections[sections.length - 1].items.push({ type: "prose", key: b.id, block: b, text: "", anchor })
  }
  return intro.items.length ? sections : sections.slice(1)
}

export const isCompute = (b: Block): b is ComputeBlock => b.kind === "sql" || b.kind === "python" || b.kind === "sheet"

/** Report view hides sql/python cells (their results surface via prose/KPIs/charts/tables). */
export const isVisible = (b: Block, view: View) => view === "notebook" || (b.kind !== "sql" && b.kind !== "python")

export const blockLabel = (b: Block) => b.title ?? b.id

/** "block.col" → [block, col]; ids are identifiers, so the first dot separates. */
export function splitRef(ref: string): [string, string | undefined] {
  const i = ref.indexOf(".")
  return i < 0 ? [ref, undefined] : [ref.slice(0, i), ref.slice(i + 1)]
}

/** `path` = Doc.path (workspace-relative notebook file; older results lack it). */
export const copyRefText = (b: Block, path: string | undefined) => `@${b.id} (${path || "notebook.md"}:${b.line})`

export const isNumericType = (t: string) => /INT|DECIMAL|NUMERIC|DOUBLE|FLOAT|REAL/i.test(t)

export const plural = (n: number, w: string) => `${n.toLocaleString("en-US")} ${w}${n === 1 ? "" : "s"}`
