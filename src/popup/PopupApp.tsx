import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { CapTabMark } from "@/components/CapTabMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getActiveTab } from "@/lib/chrome";
import { hostnameOf, isValidUrl, normalizeUrl, uid } from "@/lib/search";
import { readKey, writeKey } from "@/lib/storage";
import type { Shortcut } from "@/lib/types";

export function PopupApp() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const tab = await getActiveTab();
        if (cancelled) return;
        const nextTitle = tab?.title?.trim() || "";
        const nextUrl = tab?.url?.trim() || "";
        setTitle(nextTitle);
        setUrl(nextUrl);
        setName(nextTitle);
      } catch {
        if (!cancelled) setError("Couldn't read the active tab.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function saveShortcut() {
    const normalized = normalizeUrl(url);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Give the shortcut a name.");
      return;
    }
    if (!isValidUrl(normalized)) {
      setError("This page doesn't have a savable URL.");
      return;
    }

    const shortcuts = readKey<Shortcut[]>("shortcuts", []);
    const next: Shortcut = { id: uid(), name: trimmedName, url: normalized };
    writeKey("shortcuts", [...shortcuts, next]);
    setError("");
    setSaved(true);
    window.setTimeout(() => window.close(), 800);
  }

  const canSave = !loading && !saved && Boolean(url);

  return (
    <div className="w-[320px] bg-background p-4 text-foreground">
      <div className="mb-4 flex items-center gap-2.5">
        <CapTabMark className="h-8 w-8 shrink-0 rounded-lg" />
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">Save to CapTab</p>
          <p className="text-[11px] text-muted-foreground">Add this page as a shortcut</p>
        </div>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Reading tab…</p>
      ) : saved ? (
        <div className="flex flex-col items-center gap-2 py-8 text-sm text-foreground">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ac/15 text-ac">
            <Check className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <p className="font-medium">Saved</p>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            saveShortcut();
          }}
        >
          <div className="rounded-lg border border-black/5 bg-black/[0.03] px-3 py-2 dark:border-white/5 dark:bg-white/[0.03]">
            <p className="truncate text-sm font-medium">{title || "Untitled page"}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {url ? hostnameOf(url) : "No URL available"}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shortcut-name" className="text-[11px] text-muted-foreground">
              Shortcut name
            </Label>
            <Input
              id="shortcut-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name on new tab"
              className="h-9 text-sm"
              autoFocus
            />
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <Button type="submit" className="h-9 w-full" disabled={!canSave}>
            Save shortcut
          </Button>
        </form>
      )}
    </div>
  );
}
