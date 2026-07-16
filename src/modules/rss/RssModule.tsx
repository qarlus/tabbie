import { useCallback, useEffect, useState } from "react";
import { CircleAlert, Loader2, Plus, RefreshCw, Rss, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { relativeTime } from "@/lib/github";
import { uid } from "@/lib/search";
import { fastLinkProps } from "@/lib/fast-link";
import { cn } from "@/lib/utils";
import { ModuleEmpty } from "@/components/ModuleEmpty";
import { Panel } from "@/components/Panel";
import { FeedError, fetchFeed } from "./parse";

export interface RssFeedSource {
  id: string;
  url: string;
  title: string;
}

export interface RssFeedItem {
  id: string;
  feedId: string;
  feedTitle: string;
  title: string;
  url: string;
  publishedAt: number;
  summary?: string;
}

export interface RssData {
  feeds: RssFeedSource[];
  cache: {
    fetchedAt: number;
    items: RssFeedItem[];
  } | null;
}

/** One-click starters — no top sites / history, just solid public feeds. */
export const RSS_PRESETS: { label: string; url: string }[] = [
  { label: "Hacker News", url: "https://hnrss.org/frontpage" },
  { label: "GitHub Blog", url: "https://github.blog/feed/" },
  { label: "Chromium", url: "https://blog.chromium.org/feeds/posts/default" },
  { label: "MDN Blog", url: "https://developer.mozilla.org/en-US/blog/rss.xml" },
  { label: "Vite releases", url: "https://github.com/vitejs/vite/releases.atom" },
];

interface RssModuleProps {
  data: RssData;
  onChange: (next: RssData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

export function RssModule({ data, onChange, leading, menu, className }: RssModuleProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftUrl, setDraftUrl] = useState("");
  const [managing, setManaging] = useState(data.feeds.length === 0);

  const refresh = useCallback(async () => {
    if (data.feeds.length === 0) {
      onChange({ ...data, cache: null });
      return;
    }
    setLoading(true);
    setError(null);
    const items: RssFeedItem[] = [];
    const feedUpdates: RssFeedSource[] = [];
    const errors: string[] = [];

    await Promise.all(
      data.feeds.map(async (feed) => {
        try {
          const parsed = await fetchFeed(feed.url);
          feedUpdates.push({ ...feed, title: parsed.title || feed.title || feed.url });
          for (const item of parsed.items.slice(0, 25)) {
            items.push({
              id: `${feed.id}-${item.id}`,
              feedId: feed.id,
              feedTitle: parsed.title || feed.title,
              title: item.title,
              url: item.url,
              publishedAt: item.publishedAt,
              summary: item.summary,
            });
          }
        } catch (e) {
          feedUpdates.push(feed);
          if (e instanceof FeedError) errors.push(`${feed.title || feed.url}: ${e.message}`);
          else errors.push(`${feed.title || feed.url}: failed to load`);
        }
      })
    );

    items.sort((a, b) => b.publishedAt - a.publishedAt);
    onChange({
      feeds: data.feeds.map((f) => feedUpdates.find((u) => u.id === f.id) ?? f),
      cache: { fetchedAt: Date.now(), items: items.slice(0, 60) },
    });
    if (errors.length) setError(errors.slice(0, 2).join(" · "));
    setLoading(false);
  }, [data, onChange]);

  // Fresh fetch on every new tab when feeds are configured.
  useEffect(() => {
    if (data.feeds.length === 0) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.feeds.map((f) => f.id).join(",")]);

  async function addFeed(rawUrl?: string, preferredTitle?: string) {
    const url = (rawUrl ?? draftUrl).trim();
    if (!url) return;
    let normalized = url;
    try {
      const u = new URL(url.includes("://") ? url : `https://${url}`);
      normalized = u.toString();
    } catch {
      setError("That doesn't look like a valid URL.");
      return;
    }
    if (data.feeds.some((f) => f.url === normalized)) {
      setError("That feed is already added.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const parsed = await fetchFeed(normalized);
      const feed: RssFeedSource = {
        id: uid(),
        url: normalized,
        title: preferredTitle || parsed.title || normalized,
      };
      const newItems: RssFeedItem[] = parsed.items.slice(0, 25).map((item) => ({
        id: `${feed.id}-${item.id}`,
        feedId: feed.id,
        feedTitle: feed.title,
        title: item.title,
        url: item.url,
        publishedAt: item.publishedAt,
        summary: item.summary,
      }));
      const merged = [...newItems, ...(data.cache?.items ?? [])]
        .sort((a, b) => b.publishedAt - a.publishedAt)
        .slice(0, 60);
      onChange({
        feeds: [...data.feeds, feed],
        cache: { fetchedAt: Date.now(), items: merged },
      });
      setDraftUrl("");
      setManaging(false);
    } catch (e) {
      if (e instanceof FeedError) setError(e.message);
      else setError("Couldn't load that feed.");
    } finally {
      setLoading(false);
    }
  }

  function removeFeed(id: string) {
    const feeds = data.feeds.filter((f) => f.id !== id);
    onChange({
      feeds,
      cache: data.cache
        ? { ...data.cache, items: data.cache.items.filter((i) => i.feedId !== id) }
        : null,
    });
  }

  const items = data.cache?.items ?? [];

  return (
    <Panel
      title="Feeds"
      icon={<Rss className="h-3.5 w-3.5" />}
      leading={leading}
      className={cn("min-h-[22rem]", className)}
      badge={
        data.feeds.length > 0 ? (
          <span className="rounded-md bg-ac/15 px-1.5 py-0.5 text-[10px] font-medium text-ac normal-case tracking-normal">
            {data.feeds.length} {data.feeds.length === 1 ? "feed" : "feeds"}
            {items.length > 0 ? ` · ${items.length}` : ""}
          </span>
        ) : null
      }
      actions={
        <>
          <button
            type="button"
            onClick={() => setManaging((m) => !m)}
            className="rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {managing ? "Done" : "Feeds"}
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading || data.feeds.length === 0}
            className="h-7 gap-1.5 px-2 text-xs"
            aria-label="Refresh feeds"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          </Button>
          {menu}
        </>
      }
    >
      {managing && (
        <div className="mb-3 flex flex-col gap-2 rounded-xl border border-black/5 bg-black/[0.03] p-3 dark:border-white/5 dark:bg-white/[0.03]">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void addFeed();
            }}
          >
            <Input
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="https://…/feed.xml or releases.atom"
              className="h-8 text-xs"
              autoFocus
            />
            <Button type="submit" size="sm" className="h-8 shrink-0" disabled={!draftUrl.trim() || loading}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add
            </Button>
          </form>
          <div className="flex flex-wrap gap-1.5">
            {RSS_PRESETS.filter((p) => !data.feeds.some((f) => f.url === p.url)).map((preset) => (
              <button
                key={preset.url}
                type="button"
                disabled={loading}
                onClick={() => void addFeed(preset.url, preset.label)}
                className="rounded-md border border-black/8 bg-background/60 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-ac/40 hover:text-foreground disabled:opacity-50 dark:border-white/10"
              >
                {preset.label}
              </button>
            ))}
          </div>
          {data.feeds.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {data.feeds.map((feed) => (
                <li
                  key={feed.id}
                  className="group flex items-center gap-2 rounded-lg px-1.5 py-1 text-xs text-muted-foreground"
                >
                  <span className="min-w-0 flex-1 truncate text-foreground">{feed.title}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${feed.title}`}
                    onClick={() => removeFeed(feed.id)}
                    className="rounded p-0.5 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] leading-relaxed text-muted-foreground/70">
            Fetched directly from this browser to the feed URLs you add — no proxy. Try GitHub{" "}
            <code className="text-[10px]">releases.atom</code>, blogs, or Mastodon{" "}
            <code className="text-[10px]">/@user.rss</code>.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {data.feeds.length === 0 ? (
          <ModuleEmpty
            icon={Rss}
            title="No feeds yet"
            hint="Add an RSS or Atom URL, or tap a preset — HN, GitHub Blog, Chromium, MDN, Vite releases."
            action={
              !managing ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setManaging(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add feed
                </Button>
              ) : null
            }
          />
        ) : loading && !data.cache ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading feeds…
          </p>
        ) : items.length === 0 ? (
          <ModuleEmpty
            icon={Rss}
            title="Nothing in the feed"
            hint="Try refresh, or check that the URL is a valid RSS or Atom feed."
            action={
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void refresh()}
                disabled={loading}
              >
                <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
                Refresh
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  {...fastLinkProps(item.url, { newTab: true })}
                  className="group flex flex-col gap-0.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                >
                  <span className="truncate text-sm text-foreground">{item.title}</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="truncate">{item.feedTitle}</span>
                    {item.publishedAt > 0 && (
                      <>
                        <span className="opacity-40">·</span>
                        <span className="shrink-0">{relativeTime(item.publishedAt)}</span>
                      </>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
