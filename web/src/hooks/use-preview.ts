import { useApi } from "@/hooks/use-schema"
import type { Preview } from "@/types"

/** First `limit` (≤ 100) rows of an imported table (`GET /api/preview`); refetches on table or live-version change. */
export function usePreview(table: string | null, limit = 100) {
  const url = table ? `/api/preview?table=${encodeURIComponent(table)}&limit=${limit}` : null
  const { data, error, loading } = useApi<Preview>(url)
  return { preview: data, error, loading }
}
