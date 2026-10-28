/** "25 Oct 2026, 18:47" in the notebook's timezone; falls back to the raw string on bad input/timezone. */
export function formatRanAt(iso: string, timeZone: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  try {
    return d.toLocaleString("en-GB", { timeZone, dateStyle: "medium", timeStyle: "short" })
  } catch {
    return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
  }
}
