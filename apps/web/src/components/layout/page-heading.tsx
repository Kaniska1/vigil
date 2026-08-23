import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function PageHeading({ eyebrow, title, description, icon: Icon, badge }: { eyebrow: string; title: string; description: string; icon: LucideIcon; badge?: string }) {
  return (
    <div className="mb-7 flex flex-col gap-5 border-b border-[#333333] pb-7 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-500)]">
          <Icon className="size-4 text-[#9166ff]" />
          {eyebrow}
          {badge ? <Badge variant="secondary">{badge}</Badge> : null}
        </div>
        <h1 className="text-gradient text-3xl font-extrabold tracking-[-0.045em] sm:text-[38px]">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[var(--text-600)]">{description}</p>
      </div>
    </div>
  );
}
