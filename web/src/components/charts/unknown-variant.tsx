import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { ChartBlock } from "@/types"

export function ChartAlert({ title, message }: { title: string; message: string }) {
  return (
    <Alert variant="destructive" className="rounded-none">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="font-mono text-xs break-all">{message}</AlertDescription>
    </Alert>
  )
}

export function UnknownVariant({ block }: { block: ChartBlock }) {
  return <ChartAlert title="Unsupported chart" message={`${block.type} variant "${block.variant}" is not drawn by this viewer`} />
}
