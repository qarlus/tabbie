import { Crosshair, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FocusData {
  text: string;
}

interface FocusModuleProps {
  data: FocusData;
  onChange: (next: FocusData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

/** Single-row focus strip — intentionally smaller than card modules. */
export function FocusModule({ data, onChange, leading, menu, className }: FocusModuleProps) {
  const hasFocus = data.text.trim().length > 0;

  return (
    <section
      className={cn(
        "flex items-center gap-2 rounded-xl border border-black/8 bg-white/55 px-2 py-1.5 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.035]",
        className
      )}
    >
      {leading}
      <Crosshair className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="shrink-0 text-xs font-medium text-muted-foreground">Focus</span>
      <Input
        value={data.text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="What are you working on?"
        maxLength={160}
        className={cn(
          "h-8 min-w-0 flex-1 border-transparent bg-transparent px-1.5 text-sm font-medium shadow-none placeholder:font-normal placeholder:text-muted-foreground/50 focus-visible:ring-0 dark:bg-transparent",
          hasFocus ? "text-foreground" : "text-foreground/80"
        )}
        aria-label="Current focus"
      />
      {hasFocus ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground/60 hover:text-foreground"
          onClick={() => onChange({ text: "" })}
          aria-label="Clear focus"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      {menu}
    </section>
  );
}
