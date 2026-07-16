import { useEffect, useRef, useState } from "react";
import { CornerDownLeft, History, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  engineById,
  hostnameOf,
  looksLikeUrl,
  matchRecents,
  matchShortcuts,
  normalizeUrl,
  parseQuery,
} from "@/lib/search";
import { navigateFast, warmUrl } from "@/lib/fast-link";
import type { Settings, Shortcut } from "@/lib/types";
import { SiteIcon } from "@/components/SiteIcon";

interface SearchBarProps {
  settings: Settings;
  shortcuts: Shortcut[];
  recents: string[];
  onSearch: (query: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

type Suggestion =
  | { kind: "search"; id: string; label: string; sub: string }
  | { kind: "shortcut"; id: string; shortcut: Shortcut }
  | { kind: "recent"; id: string; query: string };

export function SearchBar({ settings, shortcuts, recents, onSearch, inputRef }: SearchBarProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const engine = engineById(settings.engine);
  const parsed = parseQuery(input, settings.engine);

  const suggestions: Suggestion[] = (() => {
    const q = parsed.query;
    const items: Suggestion[] = [];
    if (q) {
      items.push({
        kind: "search",
        id: "search",
        label: q,
        sub: looksLikeUrl(q) ? "Open URL" : `Search ${parsed.targetName}`,
      });
      for (const s of matchShortcuts(shortcuts, q, 5)) {
        items.push({ kind: "shortcut", id: `s-${s.id}`, shortcut: s });
      }
      for (const r of matchRecents(recents, q, 4)) {
        items.push({ kind: "recent", id: `r-${r}`, query: r });
      }
    } else if (input.trim() === "") {
      for (const r of recents.slice(0, 6)) {
        items.push({ kind: "recent", id: `r-${r}`, query: r });
      }
    }
    return items;
  })();

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => setActive(0), [input]);

  function submit(raw: string) {
    const p = parseQuery(raw, settings.engine);
    const q = p.query;
    if (!q) return;
    onSearch(q);
    setInput("");
    setOpen(false);
    if (looksLikeUrl(q)) {
      navigateFast(normalizeUrl(q));
    } else {
      navigateFast(p.buildUrl(q));
    }
  }

  function choose(s: Suggestion) {
    if (s.kind === "shortcut") {
      navigateFast(s.shortcut.url);
    } else if (s.kind === "recent") {
      submit(s.query);
    } else {
      submit(input);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && suggestions[active]) choose(suggestions[active]);
      else submit(input);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={cn(
          "flex h-12 items-center gap-3 rounded-lg border border-black/8 bg-white/70 px-4 backdrop-blur-md transition-colors focus-within:border-black/15 dark:border-white/10 dark:bg-white/[0.04] dark:focus-within:border-white/20",
          open && suggestions.length > 0 && "rounded-b-none border-b-transparent"
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            // Don't open the empty "recents" list on autofocus / page load —
            // only after the user has typed or navigates with arrows.
            if (input.trim()) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          autoFocus
          type="text"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-label="Search"
          placeholder={`Search ${engine.name} or enter a URL`}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/45"
        />
        {parsed.bang && (
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{parsed.targetName}</span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div
          role="listbox"
          className="absolute inset-x-0 top-full z-40 -mt-px animate-in fade-in-0 slide-in-from-top-1 overflow-hidden rounded-b-lg border border-t-0 border-black/8 bg-white/90 py-1 shadow-lg shadow-black/5 duration-150 backdrop-blur-md dark:border-white/10 dark:bg-[#12121a]/95 dark:shadow-black/40"
        >
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => {
                setActive(i);
                if (s.kind === "shortcut") warmUrl(s.shortcut.url);
              }}
              onClick={() => choose(s)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors",
                i === active ? "bg-black/[0.04] text-foreground dark:bg-white/[0.06]" : "text-muted-foreground"
              )}
            >
              {s.kind === "search" && <Search className="h-3.5 w-3.5 shrink-0 opacity-50" />}
              {s.kind === "shortcut" && <SiteIcon url={s.shortcut.url} name={s.shortcut.name} size={14} />}
              {s.kind === "recent" && <History className="h-3.5 w-3.5 shrink-0 opacity-40" />}
              <span className="min-w-0 flex-1 truncate text-foreground/90">
                {s.kind === "shortcut" ? s.shortcut.name : s.kind === "recent" ? s.query : s.label}
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground/60">
                {s.kind === "search" && s.sub}
                {s.kind === "shortcut" && hostnameOf(s.shortcut.url)}
                {i === active && <CornerDownLeft className="h-3 w-3" />}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
