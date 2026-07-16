import { useEffect, useState } from "react";
import { AlarmClock, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Panel } from "./Panel";

export interface PomodoroData {
  focusMin: number;
  breakMin: number;
  mode: "focus" | "break";
  /** Epoch ms when the active segment ends. Null when idle or paused. */
  endsAt: number | null;
  /** Remaining ms while paused. Null when idle or running. */
  remainingMs: number | null;
  completed: number;
}

interface PomodoroModuleProps {
  data: PomodoroData;
  onChange: (next: PomodoroData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

function clampMin(n: number, fallback: number): number {
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(90, Math.round(n));
}

function segmentMs(data: PomodoroData): number {
  return (data.mode === "focus" ? data.focusMin : data.breakMin) * 60_000;
}

function remainingFrom(data: PomodoroData, now: number): number {
  if (data.endsAt != null) return Math.max(0, data.endsAt - now);
  if (data.remainingMs != null) return Math.max(0, data.remainingMs);
  return segmentMs(data);
}

function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PomodoroModule({ data, onChange, leading, menu, className }: PomodoroModuleProps) {
  const [now, setNow] = useState(() => Date.now());
  const running = data.endsAt != null;
  const remaining = remainingFrom(data, now);
  const total = segmentMs(data);
  const progress = total > 0 ? 1 - remaining / total : 0;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running || remaining > 0) return;
    const nextMode = data.mode === "focus" ? "break" : "focus";
    onChange({
      ...data,
      mode: nextMode,
      endsAt: null,
      remainingMs: null,
      completed: data.mode === "focus" ? data.completed + 1 : data.completed,
    });
  }, [running, remaining, data, onChange]);

  function start() {
    const ms = data.remainingMs ?? segmentMs(data);
    onChange({ ...data, endsAt: Date.now() + ms, remainingMs: null });
    setNow(Date.now());
  }

  function pause() {
    if (data.endsAt == null) return;
    onChange({
      ...data,
      endsAt: null,
      remainingMs: Math.max(0, data.endsAt - Date.now()),
    });
  }

  function reset() {
    onChange({ ...data, endsAt: null, remainingMs: null });
  }

  function setMode(mode: "focus" | "break") {
    if (mode === data.mode) return;
    onChange({ ...data, mode, endsAt: null, remainingMs: null });
  }

  function bumpDuration(key: "focusMin" | "breakMin", delta: number) {
    const next = clampMin(data[key] + delta, key === "focusMin" ? 25 : 5);
    onChange({
      ...data,
      [key]: next,
      endsAt: null,
      remainingMs: null,
    });
  }

  return (
    <Panel
      title="Timer"
      icon={<AlarmClock className="h-3.5 w-3.5" />}
      leading={leading}
      className={cn("min-h-[14rem]", className)}
      badge={
        data.completed > 0 ? (
          <span className="rounded-md bg-ac/15 px-1.5 py-0.5 text-[10px] font-medium text-ac normal-case tracking-normal">
            {data.completed} done
          </span>
        ) : null
      }
      actions={menu}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-2">
        <div className="flex gap-1 rounded-lg bg-black/[0.04] p-0.5 dark:bg-white/[0.06]">
          {(["focus", "break"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setMode(mode)}
              className={cn(
                "rounded-md px-3 py-1 text-[11px] font-medium capitalize transition-colors",
                data.mode === mode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="relative flex h-28 w-28 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden>
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-black/10 dark:text-white/10"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress)}`}
              className="text-ac transition-[stroke-dashoffset] duration-300"
            />
          </svg>
          <span className="font-mono text-2xl tracking-tight tabular-nums text-foreground">
            {formatClock(remaining)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={running ? "outline" : "default"}
            className="h-8 gap-1.5 px-3"
            onClick={() => (running ? pause() : start())}
          >
            {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {running ? "Pause" : "Start"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 px-0"
            onClick={reset}
            aria-label="Reset timer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex w-full max-w-[14rem] items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <DurationStepper
            label="Focus"
            value={data.focusMin}
            onBump={(d) => bumpDuration("focusMin", d)}
          />
          <DurationStepper
            label="Break"
            value={data.breakMin}
            onBump={(d) => bumpDuration("breakMin", d)}
          />
        </div>
      </div>
    </Panel>
  );
}

function DurationStepper({
  label,
  value,
  onBump,
}: {
  label: string;
  value: number;
  onBump: (delta: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-8">{label}</span>
      <button
        type="button"
        className="rounded px-1 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
        onClick={() => onBump(-1)}
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <span className="w-6 text-center tabular-nums text-foreground">{value}m</span>
      <button
        type="button"
        className="rounded px-1 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
        onClick={() => onBump(1)}
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  );
}
