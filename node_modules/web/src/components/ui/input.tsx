import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <InputPrimitive type={type} data-slot="input" className={cn("h-10 w-full min-w-0 rounded-[11px] border border-[var(--line)] bg-[var(--field)] px-3 text-[13px] font-semibold text-[var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,.02)] outline-none transition-all placeholder:text-[var(--ink-3)] focus-visible:border-[var(--secondary-600)] focus-visible:ring-4 focus-visible:ring-[var(--accent-500)]/10 disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />
}
export { Input }
