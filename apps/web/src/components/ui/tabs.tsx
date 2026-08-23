"use client"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
function Tabs({ className, orientation="horizontal", ...props }: TabsPrimitive.Root.Props) { return <TabsPrimitive.Root data-slot="tabs" data-orientation={orientation} className={cn("group/tabs flex gap-4 data-horizontal:flex-col", className)} {...props} /> }
const tabsListVariants = cva("group/tabs-list inline-flex w-fit items-center rounded-xl border border-[#333333] bg-[#0d0d0d] p-1", { variants:{variant:{default:"",line:"border-transparent bg-transparent p-0"}}, defaultVariants:{variant:"default"} })
function TabsList({className,variant="default",...props}:TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>){return <TabsPrimitive.List data-slot="tabs-list" data-variant={variant} className={cn(tabsListVariants({variant}),className)} {...props}/>} 
function TabsTrigger({className,...props}:TabsPrimitive.Tab.Props){return <TabsPrimitive.Tab data-slot="tabs-trigger" className={cn("relative inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-xs font-extrabold text-[var(--text-500)] outline-none transition-all hover:text-white focus-visible:ring-4 focus-visible:ring-ring/20 data-active:bg-[#1a2030] data-active:text-white data-active:shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_4px_14px_rgba(0,0,0,.18)] [&_svg]:size-4",className)} {...props}/>} 
function TabsContent({className,...props}:TabsPrimitive.Panel.Props){return <TabsPrimitive.Panel data-slot="tabs-content" className={cn("flex-1 text-sm outline-none",className)} {...props}/>} 
export {Tabs,TabsList,TabsTrigger,TabsContent,tabsListVariants}
