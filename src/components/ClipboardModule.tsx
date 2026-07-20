import { useCallback, useEffect, useState } from "react";
import { ClipboardPaste, Copy, Link2, Loader2, Shield, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  hasPermission,
  isExtension,
  readClipboardText,
  requestPermission,
} from "@/lib/chrome";
import { fastLinkProps } from "@/lib/fast-link";
import { hostnameOf, isValidUrl, normalizeUrl, uid } from "@/lib/search";
import { useStoredState } from "@/lib/storage";
import { ModuleEmpty } from "./ModuleEmpty";
import { Panel } from "./Panel";
import { SiteIcon } from "./SiteIcon";

export type ClipboardData = Record<string, never>;

export type ShelfItem = {
  id: string;
  text: string;
  url: string | null;
  addedAt: number;
};

const MAX_SHELF = 8;

interface ClipboardModuleProps {
  data: ClipboardData;
  onChange: (next: ClipboardData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

function detectUrl(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  // Prefer first line / first token that looks like a URL
  const candidate = trimmed.split(/\s+/)[0] ?? trimmed;
  const normalized = normalizeUrl(candidate);
  return isValidUrl(normalized) ? normalized : null;
}

function pushShelf(prev: ShelfItem[], text: string): ShelfItem[] {
  const trimmed = text.trim();
  if (!trimmed) return prev;
  if (prev[0]?.text === trimmed) return prev;
  const without = prev.filter((i) => i.text !== trimmed);
  return [{ id: uid(), text: trimmed, url: detectUrl(trimmed), addedAt: Date.now() }, ...without].slice(
    0,
    MAX_SHELF
  );
}

export function ClipboardModule({ leading, menu, className }: ClipboardModuleProps) {
  const extension = isExtension();
  const [shelf, setShelf] = useStoredState<ShelfItem[]>("clipboard-shelf", []);
  const [allowed, setAllowed] = useState<boolean | null>(extension ? null : true);
  const [requesting, setRequesting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!extension) {
      setAllowed(true);
      return;
    }
    void hasPermission("clipboardRead").then(setAllowed);
  }, [extension]);

  const ingest = useCallback(
    async (opts?: { force?: boolean }) => {
      if (extension && allowed !== true && !opts?.force) return;
      setBusy(true);
      try {
        const text = await readClipboardText();
        if (text) setShelf((prev) => pushShelf(prev, text));
      } finally {
        setBusy(false);
      }
    },
    [extension, allowed, setShelf]
  );

  useEffect(() => {
    if (allowed !== true) return;
    void ingest();
    const onVis = () => {
      if (document.visibilityState === "visible") void ingest();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [allowed, ingest]);

  async function grant() {
    setRequesting(true);
    try {
      const ok = await requestPermission("clipboardRead");
      setAllowed(ok);
      if (ok) await ingest({ force: true });
    } finally {
      setRequesting(false);
    }
  }

  async function copyBack(item: ShelfItem) {
    try {
      await navigator.clipboard.writeText(item.text);
      setCopiedId(item.id);
      window.setTimeout(() => setCopiedId((id) => (id === item.id ? null : id)), 1200);
    } catch {
      // ignore
    }
  }

  function remove(id: string) {
    setShelf((prev) => prev.filter((i) => i.id !== id));
  }

  function clearAll() {
    setShelf([]);
  }

  return (
    <Panel
      title="Clipboard"
      icon={<ClipboardPaste className="h-3.5 w-3.5" />}
      leading={leading}
      className={className}
      badge={
        shelf.length > 0 ? (
          <span className="rounded-md bg-ac/15 px-1.5 py-0.5 text-[10px] font-medium text-ac">
            {shelf.length}
          </span>
        ) : null
      }
      actions={
        <>
          {shelf.length > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void ingest({ force: true })}
            disabled={busy || (extension && allowed === false)}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            aria-label="Add from clipboard"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ClipboardPaste className="h-3 w-3" />}
            Capture
          </button>
          {menu}
        </>
      }
    >
      {extension && allowed === false ? (
        <ModuleEmpty
          icon={Shield}
          title="Allow clipboard read"
          hint="CapTab snapshots the clipboard when you open a new tab — local only, no polling."
          action={
            <Button type="button" size="sm" disabled={requesting} onClick={() => void grant()}>
              {requesting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Shield className="mr-1.5 h-3.5 w-3.5" />}
              Allow clipboard
            </Button>
          }
        />
      ) : shelf.length === 0 ? (
        <ModuleEmpty
          icon={ClipboardPaste}
          title="Shelf is empty"
          hint="Copy a link or snippet, then open a new tab — or hit Capture."
          action={
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void ingest({ force: true })}
            >
              <ClipboardPaste className="mr-1.5 h-3.5 w-3.5" /> Capture now
            </Button>
          }
        />
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto pr-1">
          {shelf.map((item) => (
            <li
              key={item.id}
              className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              {item.url ? (
                <a {...fastLinkProps(item.url)} className="flex min-w-0 flex-1 items-center gap-2.5">
                  <SiteIcon url={item.url} name={item.text} size={16} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {hostnameOf(item.url) || item.text}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">{item.text}</span>
                  </span>
                  <Link2 className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </a>
              ) : (
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{item.text}</span>
              )}
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                aria-label="Copy"
                onClick={() => void copyBack(item)}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                aria-label="Remove"
                onClick={() => remove(item.id)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {copiedId === item.id ? (
                <span className="text-[10px] text-muted-foreground">Copied</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {shelf.length > 0 ? (
        <p className="mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
          <Trash2 className="h-2.5 w-2.5" aria-hidden />
          Local only · last {MAX_SHELF} captures
        </p>
      ) : null}
    </Panel>
  );
}
