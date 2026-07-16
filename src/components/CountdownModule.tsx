import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Panel } from "./Panel";

export interface CountdownData {
  label: string;
  /** Target instant as epoch ms. */
  targetAt: number;
}

interface CountdownModuleProps {
  data: CountdownData;
  onChange: (next: CountdownData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

function formatRemaining(targetAt: number, now: number): {
  primary: string;
  secondary: string;
  past: boolean;
} {
  const diff = targetAt - now;
  if (diff <= 0) {
    const ago = Math.abs(diff);
    const days = Math.floor(ago / (24 * 60 * 60 * 1000));
    return {
      primary: "Now",
      secondary: days > 0 ? `Passed ${days}d ago` : "That moment has arrived",
      past: true,
    };
  }

  const totalMin = Math.floor(diff / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;

  if (days > 0) {
    return {
      primary: `${days}d ${hours}h`,
      secondary: days === 1 ? "1 day left" : `${days} days left`,
      past: false,
    };
  }
  if (hours > 0) {
    return {
      primary: `${hours}h ${mins}m`,
      secondary: hours === 1 ? "About an hour left" : `${hours} hours left`,
      past: false,
    };
  }
  return {
    primary: `${Math.max(mins, 1)}m`,
    secondary: "Less than an hour",
    past: false,
  };
}

function toLocalInputValue(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatTarget(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ts));
}

export function CountdownModule({ data, onChange, leading, menu, className }: CountdownModuleProps) {
  const [now, setNow] = useState(() => Date.now());
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { primary, secondary, past } = formatRemaining(data.targetAt, now);

  return (
    <Panel
      title="Countdown"
      icon={<Timer className="h-3.5 w-3.5" />}
      leading={leading}
      className={className}
      actions={
        <>
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {editing ? "Done" : "Edit"}
          </button>
          {menu}
        </>
      }
    >
      {editing ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cd-label" className="text-[11px]">
              Label
            </Label>
            <Input
              id="cd-label"
              value={data.label}
              onChange={(e) => onChange({ ...data, label: e.target.value })}
              placeholder="Ship date"
              className="h-9"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cd-when" className="text-[11px]">
              When
            </Label>
            <Input
              id="cd-when"
              type="datetime-local"
              value={toLocalInputValue(data.targetAt)}
              onChange={(e) => {
                const next = Date.parse(e.target.value);
                if (!Number.isNaN(next)) onChange({ ...data, targetAt: next });
              }}
              className="h-9"
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex w-full flex-1 flex-col items-start justify-center gap-1.5 rounded-xl px-1 py-3 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
        >
          <span
            className={cn(
              "font-clock text-3xl tabular-nums tracking-tight sm:text-4xl",
              past ? "text-ac" : "text-foreground"
            )}
          >
            {primary}
          </span>
          <span className="text-sm text-foreground/90">{data.label || "Untitled"}</span>
          <span className="text-xs text-muted-foreground">{secondary}</span>
          <span className="mt-1 text-[11px] text-muted-foreground/55">{formatTarget(data.targetAt)}</span>
        </button>
      )}
    </Panel>
  );
}
