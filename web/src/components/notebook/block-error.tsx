import { AlertCircleIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function BlockError({ title = "Error", message }: { title?: string; message: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="font-mono text-xs break-words whitespace-pre-wrap">{message}</AlertDescription>
    </Alert>
  )
}
