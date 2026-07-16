/**
 * Make outbound navigations feel snappier:
 * - warm DNS/TLS to the origin on hover/focus
 * - start navigation on pointerdown (left click, no modifiers)
 *   instead of waiting for click (~100ms)
 */

const warmedOrigins = new Set<string>();

function ensureHeadLink(rel: string, href: string) {
  const selector = `link[rel="${rel}"][href="${CSS.escape(href)}"]`;
  if (document.head.querySelector(selector)) return;
  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  if (rel === "preconnect") link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

/** DNS-prefetch + preconnect the URL's origin (once per origin per session). */
export function warmUrl(href: string): void {
  try {
    const url = new URL(href, window.location.href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    const origin = url.origin;
    if (warmedOrigins.has(origin)) return;
    warmedOrigins.add(origin);
    ensureHeadLink("dns-prefetch", origin);
    ensureHeadLink("preconnect", origin);
  } catch {
    // invalid URL — ignore
  }
}

function hasNavModifier(e: Pick<MouseEvent, "metaKey" | "ctrlKey" | "shiftKey" | "altKey">): boolean {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("button, input, textarea, select, [data-no-fast-nav]"));
}

export interface FastNavOptions {
  /** Open in a new tab (default false — replace this tab, typical for shortcuts). */
  newTab?: boolean;
}

/** Navigate immediately (used from pointerdown). */
export function navigateFast(href: string, options: FastNavOptions = {}): void {
  if (options.newTab) {
    window.open(href, "_blank", "noopener,noreferrer");
  } else {
    window.location.assign(href);
  }
}

export type FastLinkProps = {
  href: string;
  onPointerEnter?: React.PointerEventHandler<HTMLAnchorElement>;
  onFocus?: React.FocusEventHandler<HTMLAnchorElement>;
  onPointerDown?: React.PointerEventHandler<HTMLAnchorElement>;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  target?: string;
  rel?: string;
};

/**
 * Props to spread onto an `<a>` for warmer, earlier navigation.
 * Composes with existing handlers.
 */
export function fastLinkProps(href: string, options: FastNavOptions = {}): FastLinkProps {
  const newTab = options.newTab ?? false;

  return {
    href,
    ...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {}),
    onPointerEnter: () => warmUrl(href),
    onFocus: () => warmUrl(href),
    onPointerDown: (e) => {
      if (e.button !== 0 || hasNavModifier(e) || isInteractiveTarget(e.target)) return;
      warmUrl(href);
      e.preventDefault();
      navigateFast(href, { newTab });
    },
    onClick: (e) => {
      // pointerdown already navigated for plain left-clicks
      if (e.button === 0 && !hasNavModifier(e) && !isInteractiveTarget(e.target)) {
        e.preventDefault();
      }
    },
  };
}
