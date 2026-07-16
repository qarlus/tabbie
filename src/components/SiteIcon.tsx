import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { hostnameOf } from "@/lib/search";

declare const chrome: { runtime?: { id?: string; getURL: (path: string) => string } } | undefined;

/** Build favicon URL candidates: Chrome cache first, then a public icon helper, then letter fallback. */
export function iconSources(pageUrl: string, size = 32): string[] {
  const host = hostnameOf(pageUrl);
  const sources: string[] = [];

  try {
    if (typeof chrome !== "undefined" && chrome.runtime?.id && chrome.runtime.getURL) {
      const favicon = new URL(chrome.runtime.getURL("/_favicon/"));
      favicon.searchParams.set("pageUrl", pageUrl.startsWith("http") ? pageUrl : `https://${host}`);
      favicon.searchParams.set("size", String(size));
      sources.push(favicon.toString());
    }
  } catch {
    // Not running as an extension.
  }

  if (host) {
    // Reliable brand icons for common sites when the Chrome cache isn't available (dev / first visit).
    sources.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`);
    sources.push(`https://icons.duckduckgo.com/ip3/${host}.ico`);
  }

  return sources;
}

interface SiteIconProps {
  url: string;
  name: string;
  size?: number;
  className?: string;
}

/** Site favicon with letter fallback if every source fails. */
export function SiteIcon({ url, name, size = 16, className }: SiteIconProps) {
  const sources = useMemo(() => iconSources(url, size >= 24 ? 64 : 32), [url, size]);
  const [index, setIndex] = useState(0);
  const src = sources[index];
  const letter = (name || hostnameOf(url) || "?").charAt(0).toUpperCase();

  if (!src) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded text-[10px] font-medium text-muted-foreground",
          className
        )}
        style={{ width: size, height: size }}
        aria-hidden
      >
        {letter}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={cn("shrink-0 rounded object-contain", className)}
      style={{ width: size, height: size }}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
