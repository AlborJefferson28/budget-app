import * as React from "react"

export function ProgressBar({ value, color = "bg-primary", className = "" }) {
  return (
    <div className={`w-full h-2 bg-muted rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}
