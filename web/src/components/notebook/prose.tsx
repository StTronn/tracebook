import { useMemo } from "react"
import { renderMarkdown } from "@/lib/markdown"

/** Sanitized markdown; `.tb-ref` clicks are handled by the delegating listener in <Notebook>. */
export function Prose({ text }: { text: string }) {
  const html = useMemo(() => renderMarkdown(text), [text])
  return <div className="tb-prose prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
}
