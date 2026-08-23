import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn("min-h-28 w-full resize-y rounded-[13px] border border-[var(--line)] bg-[var(--field)] px-3.5 py-3 text-[13px] font-semibold leading-6 text-[var(--ink)] outline-none transition-all placeholder:text-[var(--ink-3)] focus-visible:border-[var(--secondary-600)] focus-visible:ring-4 focus-visible:ring-[var(--accent-500)]/10 disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />
}
export { Textarea }
