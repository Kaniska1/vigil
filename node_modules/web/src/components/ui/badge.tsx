import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 text-[11px] font-extrabold tracking-[0.01em] whitespace-nowrap transition-colors [&>svg]:size-3.5",
  { variants: { variant: {
    default: "border-[var(--accent-600)]/30 bg-[var(--purple-tint)] text-[var(--accent-900)]",
    secondary: "border-[var(--primary-500)]/28 bg-[var(--blue-tint)] text-[var(--primary-800)]",
    destructive: "border-red-500/25 bg-red-500/10 text-red-300",
    outline: "border-[var(--line)] bg-[var(--inset)] text-[var(--ink-2)]",
    ghost: "border-transparent bg-transparent text-[var(--ink-3)] hover:bg-[var(--hover)] hover:text-[var(--ink)]",
    link: "border-transparent bg-transparent p-0 text-[var(--primary-800)] underline-offset-4 hover:underline",
  }}, defaultVariants: { variant: "default" } }
)

function Badge({ className, variant="default", render, ...props }: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({ defaultTagName:"span", props: mergeProps<"span">({ className: cn(badgeVariants({variant}), className)}, props), render, state:{slot:"badge",variant} })
}
export { Badge, badgeVariants }
