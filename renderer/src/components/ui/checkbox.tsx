import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-8 shrink-0 items-center justify-center rounded-md border-2 border-border/40 outline-none aura-tx-interactive",
        "bg-muted/5 hover:bg-muted/15 hover:border-border/60 hover:shadow-sm",
        "focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Checked состояние - заполнено foreground цветом с анимацией
        "data-checked:checkbox-fill-animation data-checked:text-background data-checked:shadow-lg data-checked:hover:shadow-xl",
        "after:absolute after:-inset-x-3 after:-inset-y-2",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className={cn(
          "grid place-content-center text-current aura-tx-transform",
          // Анимация галочки с масштабированием и поворотом
          "[&>svg]:size-5 [&>svg]:checkbox-check-pop",
          "drop-shadow-sm"
        )}
      >
        <CheckIcon strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
