import { useCallback, useEffect, useState } from "react";
import { Globe, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getTopSites,
  hasPermission,
  isExtension,
  requestPermission,
  type TopSiteEntry,
} from "@/lib/chrome";
import { fastLinkProps } from "@/lib/fast-link";
import { hostnameOf } from "@/lib/search";
import { ModuleEmpty } from "./ModuleEmpty";
import { Panel } from "./Panel";
import { SiteIcon } from "./SiteIcon";

export type TopSitesData = Record<string, never>;

interface TopSitesModuleProps {
  data: TopSitesData;
  onChange: (next: TopSitesData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

export function TopSitesModule({ leading, menu, className }: TopSitesModuleProps) {
  const extension = isExtension();
  const [allowed, setAllowed] = useState<boolean | null>(extension ? null : false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<TopSiteEntry[]>([]);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!extension) {
      setAllowed(false);
      return;
    }
    void hasPermission("topSites").then(setAllowed);
  }, [extension]);

  const load = useCallback(async () => {
    if (!extension || allowed !== true) return;
    setLoading(true);
    setError(null);
    try {
      setSites(await getTopSites(16));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load top sites");
      setSites([]);
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
      setAllowed(await requestPermission("topSites"));
    } finally {
      setRequesting(false);
    }
  }

  return (
    <Panel
      title="Top sites"
      icon={<Globe className="h-3.5 w-3.5" />}
      leading={leading}
      className={className}
      actions={menu}
    >
      {!extension ? (
        <ModuleEmpty
          icon={Globe}
          title="Extension only"
          hint="Install CapTab as a new tab extension to see most-visited sites."
        />
      ) : allowed === null || (loading && sites.length === 0) ? (
        <div className="flex flex-1 items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      ) : allowed === false ? (
        <ModuleEmpty
          icon={Shield}
          title="Allow top sites"
          hint="Chrome only shares most-visited sites when you allow it. Nothing is uploaded."
          action={
            <Button type="button" size="sm" disabled={requesting} onClick={() => void grant()}>
              {requesting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Shield className="mr-1.5 h-3.5 w-3.5" />}
              Allow top sites
            </Button>
          }
        />
      ) : error ? (
        <ModuleEmpty icon={Globe} title="Could not load" hint={error} />
      ) : sites.length === 0 ? (
        <ModuleEmpty icon={Globe} title="No top sites yet" hint="Browse a while — Chrome builds this list locally." />
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto pr-1">
          {sites.map((site) => (
            <li key={site.url}>
              <a
                {...fastLinkProps(site.url)}
                className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                <SiteIcon url={site.url} name={site.title} size={16} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground">{site.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {hostnameOf(site.url)}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
