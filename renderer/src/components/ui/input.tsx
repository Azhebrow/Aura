import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(function Input(
  { className, type, ...props },
  ref
) {
  const handleFocus = React.useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      props.onFocus?.(e)
      if (e.defaultPrevented) return
      if (props.disabled || props.readOnly) return
      const isNumericField = type === "number" || props.inputMode === "numeric" || props.inputMode === "decimal"
      if (!isNumericField) return
      const raw = e.currentTarget.value.trim().replace(",", ".")
      if (!/^0(?:\.0+)?$/.test(raw)) return
      e.currentTarget.value = ""
      e.currentTarget.dispatchEvent(new Event("input", { bubbles: true }))
    },
    [props, type]
  )

  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      onFocus={handleFocus}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base aura-tx-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
})

export { Input }
