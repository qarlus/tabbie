import { useEffect, useState } from "react";
import { AlarmClock, CalendarDays, CheckSquare, Sunrise } from "lucide-react";
import { formatEventWhen } from "@/lib/ics";
import { readTodaySnapshot, type TodaySnapshot } from "@/lib/today-sources";
import { cn } from "@/lib/utils";

export type TodayData = Record<string, never>;

interface TodayModuleProps {
  data: TodayData;
  onChange: (next: TodayData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

function timerLabel(snap: TodaySnapshot, now: number): string | null {
  const t = snap.timer;
  if (!t) return null;
  const segmentMs = (t.mode === "focus" ? t.focusMin : t.breakMin) * 60_000;
  let remaining = segmentMs;
  if (t.endsAt != null) remaining = Math.max(0, t.endsAt - now);
  else if (t.remainingMs != null) remaining = Math.max(0, t.remainingMs);
  else return null;
  const total = Math.ceil(remaining / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  const clock = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  const running = t.endsAt != null;
  return `${t.mode === "focus" ? "Focus" : "Break"} ${clock}${running ? "" : " paused"}`;
}

export function TodayModule({ leading, menu, className }: TodayModuleProps) {
  const [snap, setSnap] = useState<TodaySnapshot>(() => readTodaySnapshot());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const refresh = () => setSnap(readTodaySnapshot());
    refresh();
    const onStorage = () => refresh();
    window.addEventListener("captab:storage-change", onStorage);
    window.addEventListener("storage", onStorage);
    const id = window.setInterval(refresh, 15_000);
    return () => {
      window.removeEventListener("captab:storage-change", onStorage);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (snap.timer?.endsAt == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [snap.timer?.endsAt]);

  const when = snap.nextEvent ? formatEventWhen(snap.nextEvent, now) : null;
  const timer = timerLabel(snap, now);
  const hasAnything = Boolean(snap.nextEvent || snap.topTask || timer || snap.focusText);

  return (
    <section
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-[rgba(92,64,48,0.12)] bg-[rgba(245,240,232,0.62)] px-2 py-1.5 backdrop-blur-md dark:border-[rgba(255,236,214,0.1)] dark:bg-[rgba(24,18,14,0.48)]",
        className
      )}
    >
      {leading}
      <Sunrise className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="shrink-0 text-xs font-medium text-muted-foreground">Today</span>

      {!hasAnything ? (
        <p className="min-w-0 flex-1 text-[11px] text-muted-foreground">
          Add Agenda, Checklist, or Timer — this strip pulls them together.
        </p>
      ) : (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          {snap.nextEvent && when ? (
            <span className="inline-flex min-w-0 max-w-[14rem] items-center gap-1.5 text-[11px] text-foreground/90">
              <CalendarDays className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate font-medium">{snap.nextEvent.title}</span>
              <span className="shrink-0 text-muted-foreground">
                {when.day} {when.time}
              </span>
            </span>
          ) : null}
          {snap.topTask ? (
            <span className="inline-flex min-w-0 max-w-[12rem] items-center gap-1.5 text-[11px] text-foreground/90">
              <CheckSquare className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate">{snap.topTask.text}</span>
            </span>
          ) : null}
          {timer ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] tabular-nums text-foreground/90">
              <AlarmClock className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
              <span className="font-medium">{timer}</span>
            </span>
          ) : snap.focusText ? (
            <span className="inline-flex min-w-0 max-w-[12rem] items-center gap-1.5 text-[11px] text-foreground/90">
              <span className="truncate">{snap.focusText}</span>
            </span>
          ) : null}
        </div>
      )}
      {menu}
    </section>
  );
}
