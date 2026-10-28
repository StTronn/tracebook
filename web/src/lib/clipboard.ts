/** navigator.clipboard (secure contexts) with an execCommand fallback (older/file:// policies). */
export async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement("textarea")
    ta.value = text
    ta.setAttribute("readonly", "")
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0"
    document.body.append(ta)
    ta.select()
    try {
      return document.execCommand("copy")
    } catch {
      return false
    } finally {
      ta.remove()
    }
  }
}
