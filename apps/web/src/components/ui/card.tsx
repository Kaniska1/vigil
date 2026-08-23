import * as React from "react"
import { cn } from "@/lib/utils"

function Card({ className, size = "default", ...props }: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col overflow-hidden rounded-2xl border border-[var(--background-200)] bg-[var(--background-100)]/90 text-card-foreground shadow-[0_18px_50px_rgba(0,0,0,.24),inset_0_1px_0_rgba(255,255,255,.025)] backdrop-blur-xl",
        className
      )}
      {...props}
    />
  )
}
function CardHeader({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="card-header" className={cn("grid gap-1.5 px-5 pt-5", className)} {...props} /> }
function CardTitle({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="card-title" className={cn("font-heading text-base font-extrabold tracking-[-0.03em] text-[var(--text-950)]", className)} {...props} /> }
function CardDescription({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="card-description" className={cn("text-sm leading-6 text-[var(--text-600)]", className)} {...props} /> }
function CardAction({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="card-action" className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)} {...props} /> }
function CardContent({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="card-content" className={cn("px-5 pb-5", className)} {...props} /> }
function CardFooter({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="card-footer" className={cn("flex items-center border-t border-[var(--background-200)] bg-[var(--background-50)]/65 px-5 py-4", className)} {...props} /> }
export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }
