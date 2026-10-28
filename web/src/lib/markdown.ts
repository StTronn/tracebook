import DOMPurify from "dompurify"
import { marked } from "marked"

// Python substitutes {{refs}} as <span class="tb-ref" data-ref="block.col">; make them keyboard-reachable buttons.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (!(node instanceof Element)) return
  if (node.classList.contains("tb-ref") && node.hasAttribute("data-ref")) {
    node.setAttribute("role", "button")
    node.setAttribute("tabindex", "0")
    node.setAttribute("title", `trace ${node.getAttribute("data-ref")}`)
  }
  if (node.tagName === "A" && node.hasAttribute("href")) {
    node.setAttribute("target", "_blank")
    node.setAttribute("rel", "noopener noreferrer")
  }
})

const PURIFY = { ADD_ATTR: ["data-ref", "target"] }

export const renderMarkdown = (md: string): string =>
  DOMPurify.sanitize(marked.parse(md, { async: false, gfm: true }), PURIFY)

export const renderInline = (md: string): string =>
  DOMPurify.sanitize(marked.parseInline(md, { async: false, gfm: true }), PURIFY)

/** Plain text of sanitized HTML (outline labels). */
export const textOf = (html: string): string =>
  new DOMParser().parseFromString(html, "text/html").body.textContent?.trim() ?? ""
