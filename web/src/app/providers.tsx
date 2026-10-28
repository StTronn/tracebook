import type { ReactNode } from "react"
import { LiveProvider } from "@/app/live-context"
import { TooltipProvider } from "@/components/ui/tooltip"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LiveProvider>
      <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
    </LiveProvider>
  )
}
