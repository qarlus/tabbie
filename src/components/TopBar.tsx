import { useEffect, useState } from "react";
import { Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  dayOffsetVsLocal,
  formatClock,
  resolveWorldClocks,
  type WorldClockCity,
} from "@/lib/clocks";
import type { Settings as AppSettings } from "@/lib/types";
import { CapTabMark } from "./CapTabMark";

interface TopBarProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  className?: string;
}

export function TopBar({ settings, onOpenSettings, className }: TopBarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const localTime = formatClock(now, settings.clock24);
  const worldCities = resolveWorldClocks(settings.worldClocks);
  const name = settings.name.trim();
  const showAlways = settings.worldClocksDisplay === "always" && worldCities.length > 0;
  const showHover = settings.worldClocksDisplay === "hover" && worldCities.length > 0;

  return (
    <header
      className={cn(
        "absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-4 px-5 py-3 sm:px-7",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <CapTabMark className="h-5 w-5 shrink-0 rounded-[5px] shadow-sm ring-1 ring-black/5 dark:ring-white/10" />
        <span className="text-xs font-medium tracking-wide text-muted-foreground/70 select-none">
          captab
        </span>

        <div
          className={cn("relative ml-1", showHover && "group")}
          tabIndex={showHover ? 0 : undefined}
        >
          <time
            dateTime={now.toISOString()}
            className="font-clock text-sm tabular-nums text-foreground/75 select-none"
            aria-label={showHover ? "Local time — hover for world clocks" : "Local time"}
          >
            {localTime}
          </time>

          {showAlways ? (
            <span className="ml-2.5 hidden items-baseline gap-2 sm:inline-flex">
              {worldCities.slice(0, 4).map((city) => (
                <WorldClockInline key={city.id} city={city} now={now} clock24={settings.clock24} />
              ))}
              {worldCities.length > 4 ? (
                <span className="text-[10px] text-muted-foreground/50">+{worldCities.length - 4}</span>
              ) : null}
            </span>
          ) : null}

          {showHover ? (
            <div
              role="list"
              className="pointer-events-none absolute left-0 top-full z-40 mt-1.5 min-w-[9.5rem] origin-top-left scale-95 rounded-lg border border-black/8 bg-background/95 p-1.5 opacity-0 shadow-md backdrop-blur-sm transition-all duration-150 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:scale-100 group-focus-within:opacity-100 dark:border-white/10"
            >
              {worldCities.map((city) => (
                <WorldClockRow key={city.id} city={city} now={now} clock24={settings.clock24} />
              ))}
            </div>
          ) : null}
        </div>

        {name ? <span className="hidden truncate text-xs text-muted-foreground/50 sm:inline">{name}</span> : null}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <TopBarButton
          label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </TopBarButton>
        <TopBarButton label="Settings" onClick={onOpenSettings}>
          <Settings className="h-3.5 w-3.5" />
        </TopBarButton>
      </div>
    </header>
  );
}

function WorldClockInline({
  city,
  now,
  clock24,
}: {
  city: WorldClockCity;
  now: Date;
  clock24: boolean;
}) {
  const offset = dayOffsetVsLocal(now, city.timeZone);
  return (
    <span className="inline-flex items-baseline gap-1 text-[11px] text-muted-foreground/55" title={city.city}>
      <span className="font-medium tracking-wide">{city.label}</span>
      <span className="font-clock tabular-nums">{formatClock(now, clock24, city.timeZone)}</span>
      {offset !== 0 ? (
        <span className="text-[9px] tabular-nums opacity-70">
          {offset > 0 ? "+1" : "−1"}
        </span>
      ) : null}
    </span>
  );
}

function WorldClockRow({
  city,
  now,
  clock24,
}: {
  city: WorldClockCity;
  now: Date;
  clock24: boolean;
}) {
  const offset = dayOffsetVsLocal(now, city.timeZone);
  return (
    <div
      role="listitem"
      className="flex items-center justify-between gap-4 rounded-md px-2 py-1.5 text-xs"
    >
      <span className="text-muted-foreground">{city.city}</span>
      <span className="flex items-baseline gap-1.5 font-clock tabular-nums text-foreground/80">
        {formatClock(now, clock24, city.timeZone)}
        {offset !== 0 ? (
          <span className="text-[10px] text-muted-foreground/60">{offset > 0 ? "+1d" : "−1d"}</span>
        ) : null}
      </span>
    </div>
  );
}

function TopBarButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-black/[0.04] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20 dark:hover:bg-white/[0.06]",
        className
      )}
    >
      {children}
    </button>
  );
}
