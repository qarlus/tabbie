import { useCallback, useEffect, useState } from "react";
import { Copy, Download, ExternalLink, FolderOpen, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getRecentDownloads,
  hasPermission,
  isExtension,
  openDownload,
  requestPermission,
  showDownloadInFolder,
  type DownloadEntry,
} from "@/lib/chrome";
import { ModuleEmpty } from "./ModuleEmpty";
import { Panel } from "./Panel";

export type DownloadsData = Record<string, never>;

interface DownloadsModuleProps {
  data: DownloadsData;
  onChange: (next: DownloadsData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

export function DownloadsModule({ leading, menu, className }: DownloadsModuleProps) {
  const extension = isExtension();
  const [allowed, setAllowed] = useState<boolean | null>(extension ? null : false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DownloadEntry[]>([]);
  const [requesting, setRequesting] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (!extension) {
      setAllowed(false);
      return;
    }
    void hasPermission("downloads").then(setAllowed);
  }, [extension]);

  const load = useCallback(async () => {
    if (!extension || allowed !== true) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await getRecentDownloads(3));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load downloads");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [extension, allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  async function grant() {
    setRequesting(true);
    try {
      setAllowed(await requestPermission("downloads"));
    } finally {
      setRequesting(false);
    }
  }

  async function copyPath(item: DownloadEntry) {
    try {
      await navigator.clipboard.writeText(item.filename);
      setCopiedId(item.id);
      window.setTimeout(() => setCopiedId((id) => (id === item.id ? null : id)), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <Panel
      title="Downloads"
      icon={<Download className="h-3.5 w-3.5" />}
      leading={leading}
      className={className}
      badge={
        items.length > 0 ? (
          <span className="rounded-md bg-ac/15 px-1.5 py-0.5 text-[10px] font-medium text-ac">
            {items.length}
          </span>
        ) : null
      }
      actions={menu}
    >
      {!extension ? (
        <ModuleEmpty
          icon={Download}
          title="Extension only"
          hint="Install CapTab as a new tab extension to see recent downloads."
        />
      ) : allowed === null || (loading && items.length === 0) ? (
        <div className="flex flex-1 items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      ) : allowed === false ? (
        <ModuleEmpty
          icon={Shield}
          title="Allow downloads"
          hint="Chrome only lists recent downloads when you allow it. Nothing is uploaded."
          action={
            <Button type="button" size="sm" disabled={requesting} onClick={() => void grant()}>
              {requesting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Shield className="mr-1.5 h-3.5 w-3.5" />}
              Allow downloads
            </Button>
          }
        />
      ) : error ? (
        <ModuleEmpty icon={Download} title="Could not load" hint={error} />
      ) : items.length === 0 ? (
        <ModuleEmpty icon={Download} title="No recent downloads" hint="Finished downloads will show up here." />
      ) : (
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{item.basename}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{item.filename}</span>
              </span>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Open file"
                  onClick={() => {
                    try {
                      openDownload(item.id);
                    } catch {
                      // ignore
                    }
                  }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Show in folder"
                  title="Show in folder"
                  onClick={() => {
                    try {
                      showDownloadInFolder(item.id);
                    } catch {
                      // ignore
                    }
                  }}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Copy path"
                  onClick={() => void copyPath(item)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              {copiedId === item.id ? (
                <span className="text-[10px] text-muted-foreground">Copied</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
