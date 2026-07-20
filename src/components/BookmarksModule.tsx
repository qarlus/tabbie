import { useCallback, useEffect, useState } from "react";
import { Bookmark, ChevronRight, Folder, FolderOpen, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BOOKMARK_ROOT,
  getBookmarkSubTree,
  getBookmarkTree,
  getRecentBookmarks,
  hasPermission,
  isExtension,
  requestPermission,
  watchBookmarks,
  type ChromeBookmarkNode,
} from "@/lib/chrome";
import { fastLinkProps } from "@/lib/fast-link";
import { cn } from "@/lib/utils";
import { ModuleEmpty } from "./ModuleEmpty";
import { Panel } from "./Panel";
import { SiteIcon } from "./SiteIcon";
import { CapTabMark } from "./CapTabMark";

export type BookmarksView = "bar" | "other" | "recent" | "folder";

export interface BookmarksData {
  view: BookmarksView;
  folderId: string | null;
}

interface BookmarksModuleProps {
  data: BookmarksData;
  onChange: (next: BookmarksData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

type Crumb = { id: string; title: string };

function isFolder(node: ChromeBookmarkNode): boolean {
  return !node.url;
}

function sortNodes(nodes: ChromeBookmarkNode[]): ChromeBookmarkNode[] {
  return [...nodes].sort((a, b) => {
    const aFolder = isFolder(a) ? 0 : 1;
    const bFolder = isFolder(b) ? 0 : 1;
    if (aFolder !== bFolder) return aFolder - bFolder;
    return a.title.localeCompare(b.title);
  });
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function findPath(tree: ChromeBookmarkNode[], targetId: string): Crumb[] {
  const path: Crumb[] = [];
  const walk = (nodes: ChromeBookmarkNode[], trail: Crumb[]): boolean => {
    for (const n of nodes) {
      const next = [...trail, { id: n.id, title: n.title || (n.url ? "Bookmark" : "Folder") }];
      if (n.id === targetId) {
        path.push(...next);
        return true;
      }
      if (n.children && walk(n.children, next)) return true;
    }
    return false;
  };
  walk(tree, []);
  return path;
}

export function BookmarksModule({ data, onChange, leading, menu, className }: BookmarksModuleProps) {
  const extension = isExtension();
  const [allowed, setAllowed] = useState<boolean | null>(extension ? null : false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<ChromeBookmarkNode[]>([]);
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [requesting, setRequesting] = useState(false);

  const view = data.view ?? "bar";
  const folderId = data.folderId;

  useEffect(() => {
    if (!extension) {
      setAllowed(false);
      return;
    }
    void hasPermission("bookmarks").then(setAllowed);
  }, [extension]);

  const load = useCallback(async () => {
    if (!extension || allowed !== true) return;
    setLoading(true);
    setError(null);
    try {
      if (view === "recent") {
        const recent = await getRecentBookmarks(60);
        setNodes(recent.filter((n) => Boolean(n.url)));
        setCrumbs([{ id: "recent", title: "Recent" }]);
        return;
      }

      const tree = await getBookmarkTree();
      const root = tree[0];
      const top = root?.children ?? [];
      const bar = top.find((c) => c.id === BOOKMARK_ROOT.bar) ?? top[0];
      const other = top.find((c) => c.id === BOOKMARK_ROOT.other) ?? top[1];

      if (view === "folder" && folderId) {
        const folder = await getBookmarkSubTree(folderId);
        if (!folder) {
          setNodes([]);
          setCrumbs([]);
          return;
        }
        setNodes(sortNodes(folder.children ?? []));
        const path = findPath(tree, folder.id);
        const rootId = path.find((c) => c.id === BOOKMARK_ROOT.bar || c.id === BOOKMARK_ROOT.other)?.id;
        const trimmed =
          rootId != null
            ? path.slice(path.findIndex((c) => c.id === rootId))
            : path.length
              ? path
              : [{ id: folder.id, title: folder.title || "Folder" }];
        setCrumbs(trimmed);
        return;
      }

      const target = view === "other" ? other : bar;
      if (!target) {
        setNodes([]);
        setCrumbs([]);
        return;
      }
      setNodes(sortNodes(target.children ?? []));
      setCrumbs([
        {
          id: target.id,
          title: target.title || (view === "other" ? "Other bookmarks" : "Bookmarks bar"),
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read bookmarks.");
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }, [allowed, extension, folderId, view]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (allowed !== true) return;
    return watchBookmarks(() => {
      void load();
    });
  }, [allowed, load]);

  async function grantAccess() {
    setRequesting(true);
    setError(null);
    try {
      const ok = await requestPermission("bookmarks");
      setAllowed(ok);
      if (!ok) setError("Permission wasn’t granted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Permission request failed.");
    } finally {
      setRequesting(false);
    }
  }

  function openFolder(node: ChromeBookmarkNode) {
    onChange({ view: "folder", folderId: node.id });
  }

  function setView(next: "bar" | "other" | "recent") {
    if (next === "bar") onChange({ view: "bar", folderId: BOOKMARK_ROOT.bar });
    else if (next === "other") onChange({ view: "other", folderId: BOOKMARK_ROOT.other });
    else onChange({ view: "recent", folderId: null });
  }

  const activeTab: "bar" | "other" | "recent" =
    view === "recent"
      ? "recent"
      : crumbs[0]?.id === BOOKMARK_ROOT.other || view === "other"
        ? "other"
        : "bar";

  const title =
    view === "recent" ? "Recent bookmarks" : crumbs[crumbs.length - 1]?.title || "Bookmarks";

  return (
    <Panel
      title={title}
      icon={<Bookmark className="h-3.5 w-3.5" />}
      leading={leading}
      className={cn("min-h-[22rem]", className)}
      badge={
        allowed && nodes.length > 0 ? (
          <span className="rounded-md bg-ac/15 px-1.5 py-0.5 text-[10px] font-medium text-ac">
            {nodes.length}
          </span>
        ) : null
      }
      actions={menu}
    >
      {!extension ? (
        <ModuleEmpty
          visual={
            <CapTabMark className="h-10 w-10 rounded-[10px] shadow-sm ring-1 ring-black/5 dark:ring-white/10" />
          }
          title="Install CapTab as your new tab"
          hint="Bookmarks come straight from Chrome. Build, then Load unpacked from dist/ — new tabs open CapTab, and this module can read your bookmark bar."
        />
      ) : allowed === null ? (
        <p className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking access…
        </p>
      ) : allowed === false ? (
        <ModuleEmpty
          icon={Shield}
          title="Allow bookmark access"
          hint="CapTab only reads bookmarks when you say so. Nothing is uploaded — it stays in this browser."
          action={
            <Button type="button" size="sm" onClick={() => void grantAccess()} disabled={requesting}>
              {requesting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bookmark className="mr-1.5 h-3.5 w-3.5" />
              )}
              Allow bookmarks
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-2 flex flex-wrap gap-0.5">
            {(
              [
                { id: "bar" as const, label: "Bar" },
                { id: "other" as const, label: "Other" },
                { id: "recent" as const, label: "Recent" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setView(t.id)}
                aria-pressed={activeTab === t.id}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20",
                  activeTab === t.id
                    ? "bg-foreground/[0.06] font-medium text-foreground dark:bg-white/10"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {view === "folder" && crumbs.length > 1 ? (
            <div className="mb-2 flex min-w-0 items-center gap-0.5 overflow-x-auto text-[11px] text-muted-foreground">
              {crumbs.map((c, i) => (
                <span key={c.id} className="flex shrink-0 items-center gap-0.5">
                  {i > 0 ? <ChevronRight className="h-3 w-3 opacity-40" /> : null}
                  <button
                    type="button"
                    className={cn(
                      "rounded px-1 py-0.5 hover:text-foreground",
                      i === crumbs.length - 1 && "font-medium text-foreground/80"
                    )}
                    onClick={() =>
                      onChange({
                        view: c.id === BOOKMARK_ROOT.bar || c.id === BOOKMARK_ROOT.other ? (c.id === BOOKMARK_ROOT.other ? "other" : "bar") : "folder",
                        folderId: c.id,
                      })
                    }
                  >
                    {c.title}
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {error ? <p className="mb-2 text-xs text-destructive">{error}</p> : null}

          <div
            className="shrink-0 overflow-y-auto overscroll-contain pr-1"
            style={{ height: "36rem", maxHeight: "min(36rem, calc(100vh - 16rem))" }}
            onWheel={(e) => e.stopPropagation()}
          >
            {loading && nodes.length === 0 ? (
              <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading bookmarks…
              </p>
            ) : nodes.length === 0 ? (
              <ModuleEmpty
                icon={FolderOpen}
                title="This folder is empty"
                hint="Add bookmarks in Chrome and they’ll show up here."
              />
            ) : (
              <ul className="flex flex-col gap-0.5">
                {nodes.map((node) =>
                  isFolder(node) ? (
                    <li key={node.id}>
                      <button
                        type="button"
                        onClick={() => openFolder(node)}
                        className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                      >
                        <Folder className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                          {node.title || "Untitled folder"}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                      </button>
                    </li>
                  ) : (
                    <li key={node.id}>
                      <a
                        {...fastLinkProps(node.url!)}
                        className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                      >
                        <SiteIcon url={node.url!} name={node.title} size={16} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-foreground">
                            {node.title || node.url}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {safeHost(node.url!)}
                          </span>
                        </span>
                      </a>
                    </li>
                  )
                )}
              </ul>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}
