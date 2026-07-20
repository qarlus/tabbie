import { cn } from "@/lib/utils";
import { fastLinkProps } from "@/lib/fast-link";

const AI_SHORTCUTS = [
  { name: "ChatGPT", url: "https://chatgpt.com" },
  { name: "Claude", url: "https://claude.ai" },
  { name: "Gemini", url: "https://gemini.google.com" },
  { name: "Copilot", url: "https://copilot.microsoft.com" },
] as const;

/** Small row of official AI chat links — optional under shortcuts. */
export function AiShortcuts({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70",
        className
      )}
    >
      {AI_SHORTCUTS.map((s) => (
        <a
          key={s.url}
          {...fastLinkProps(s.url, { newTab: true })}
          className="rounded-md px-2 py-0.5 transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"
        >
          {s.name}
        </a>
      ))}
    </div>
  );
}
