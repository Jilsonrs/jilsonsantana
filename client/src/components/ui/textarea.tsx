import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-xl border border-border/60 bg-background px-6 py-4 text-[1.05rem] placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300",
        "shadow-[0_10px_40px_rgba(0,0,0,0.03),0_2px_10px_rgba(35,143,232,0.05)]",
        "focus-visible:border-primary focus-visible:shadow-[0_10px_40px_rgba(35,143,232,0.12)]",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:bg-destructive/5",
        "aria-[invalid=true]:shadow-[0_0_0_1px_hsl(var(--destructive)),0_10px_40px_hsl(var(--destructive)/0.1)]",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
