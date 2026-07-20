import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ModuleEmptyProps {
  icon?: LucideIcon;
  /** Custom visual (e.g. CapTab mark) — replaces the default icon tile. */
  visual?: ReactNode;
  title: string;
  hint: string;
  action?: ReactNode;
  className?: string;
}

/** Shared empty state for module panels. */
export function ModuleEmpty({ icon: Icon, visual, title, hint, action, className }: ModuleEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center",
        className
      )}
    >
      {visual ? (
        <span className="mb-1">{visual}</span>
      ) : Icon ? (
        <span className="mb-1 flex h-9 w-9 items-center justify-center rounded-xl bg-black/[0.04] text-muted-foreground dark:bg-white/[0.06]">
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
      <p className="text-sm font-medium text-foreground/85">{title}</p>
      <p className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground">{hint}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
