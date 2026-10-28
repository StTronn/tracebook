import type { Doc } from "@/types"

declare global {
  interface Window {
    /** Embedded results (filled by `tracebook export`); null → live mode, fetched from the dev server. */
    __TB_DATA__?: Doc | null
  }
}
