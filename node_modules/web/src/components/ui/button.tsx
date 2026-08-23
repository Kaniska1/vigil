import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-transparent text-sm font-extrabold tracking-[-0.015em] transition-all duration-200 outline-none select-none focus-visible:ring-4 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-45 active:scale-[.985] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-[var(--primary-500)] to-[var(--accent-500)] text-[var(--primary-950)] shadow-[0_10px_30px_color-mix(in_srgb,var(--accent-500)_26%,transparent),inset_0_1px_0_rgba(255,255,255,.2)] hover:from-[var(--primary-600)] hover:to-[var(--accent-600)]",
        outline:
          "border-[var(--background-200)] bg-[var(--background-100)]/85 text-[var(--text-900)] shadow-[inset_0_1px_0_rgba(255,255,255,.03)] hover:border-[var(--background-300)] hover:bg-[var(--background-200)]",
        secondary:
          "border-[var(--background-200)] bg-[var(--background-200)] text-[var(--text-900)] hover:bg-[var(--background-300)] hover:text-[var(--text-950)]",
        ghost:
          "text-[var(--text-700)] hover:bg-[var(--accent-200)] hover:text-[var(--accent-950)]",
        destructive:
          "border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/15",
        link:
          "h-auto rounded-none p-0 text-[var(--primary-700)] underline-offset-4 hover:text-[var(--primary-800)] hover:underline",
      },
      size: {
        default: "h-10 px-4",
        xs: "h-7 rounded-lg px-2.5 text-xs",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-11 rounded-xl px-5 text-sm",
        icon: "size-10",
        "icon-xs": "size-7 rounded-lg",
        "icon-sm": "size-9 rounded-lg",
        "icon-lg": "size-11 rounded-xl",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({ className, variant = "default", size = "default", ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
