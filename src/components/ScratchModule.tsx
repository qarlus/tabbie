import { StickyNote } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "./Panel";

export interface ScratchData {
  text: string;
}

interface ScratchModuleProps {
  data: ScratchData;
  onChange: (next: ScratchData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

export function ScratchModule({ data, onChange, leading, menu, className }: ScratchModuleProps) {
  const trimmed = data.text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const chars = data.text.length;

  return (
    <Panel
      title="Scratch"
      icon={<StickyNote className="h-3.5 w-3.5" />}
      leading={leading}
      className={className}
      badge={
        words > 0 ? (
          <span className="text-[10px] tabular-nums text-muted-foreground/60">
            {words} {words === 1 ? "word" : "words"}
          </span>
        ) : null
      }
      actions={menu}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <Textarea
          value={data.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Jot something down…"
          className="min-h-32 flex-1 resize-none border-transparent bg-transparent px-1 py-1 text-sm leading-relaxed shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        <p className="mt-1 px-1 text-[10px] text-muted-foreground/50">
          {chars > 0 ? `${chars.toLocaleString()} characters · autosaved here` : "Autosaves on this device only"}
        </p>
      </div>
    </Panel>
  );
}
