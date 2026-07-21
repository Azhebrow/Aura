import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full resize-none rounded-lg border border-soft bg-control/55 px-2.5 py-2 text-base aura-tx-colors outline-none placeholder:text-faint focus-visible:border-ring focus-visible:bg-control/75 focus-visible:ring-2 focus-visible:ring-ring/70 disabled:cursor-not-allowed disabled:bg-control disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
