import { cn } from "@/lib/utils";

interface PanelProps {
  title: string;
  icon?: React.ReactNode;
  leading?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Quiet panel chrome for dashboard modules. */
export function Panel({ title, icon, leading, badge, actions, className, children }: PanelProps) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col rounded-xl border border-black/8 bg-white/55 p-3.5 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.035]",
        className
      )}
    >
      <header className="mb-2.5 flex shrink-0 items-center gap-2">
        {leading}
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h3 className="truncate text-sm font-medium text-foreground/90">{title}</h3>
        {badge}
        {actions && <div className="ml-auto flex shrink-0 items-center gap-0.5">{actions}</div>}
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
