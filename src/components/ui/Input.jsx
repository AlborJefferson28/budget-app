import * as React from "react"

import { cn } from "../../lib/utils"

const Input = React.forwardRef(({ className, type, numeric = false, inputMode, pattern, ...props }, ref) => {
  const useNumericKeyboard = numeric || type === "number"
  const resolvedInputMode = inputMode ?? (useNumericKeyboard ? "numeric" : undefined)
  const resolvedPattern = pattern ?? (useNumericKeyboard ? "[0-9.,\\s]*" : undefined)

  return (
    <input
      type={type}
      inputMode={resolvedInputMode}
      pattern={resolvedPattern}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
