import { useEffect, useRef, useState } from "react";
import {
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Loader2,
  MapPin,
  RefreshCw,
  Sun,
  Cloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  WeatherError,
  fetchWeather,
  placeLabel,
  searchPlaces,
  weatherKind,
  weatherLabel,
  type GeocodeResult,
  type WeatherPlace,
  type WeatherSnapshot,
} from "@/lib/weather";
import { ModuleEmpty } from "./ModuleEmpty";
import { Panel } from "./Panel";
import { WeatherVisual } from "./WeatherVisual";

export interface WeatherData {
  place: WeatherPlace | null;
  cache: WeatherSnapshot | null;
  /** Prefer Celsius; false = Fahrenheit. */
  celsius: boolean;
}

interface WeatherModuleProps {
  data: WeatherData;
  onChange: (next: WeatherData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

const KIND_ICON = {
  clear: Sun,
  cloud: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
} as const;

function formatTemp(celsius: number, useC: boolean): string {
  const v = useC ? celsius : (celsius * 9) / 5 + 32;
  return `${Math.round(v)}°${useC ? "C" : "F"}`;
}

function errMessage(err: unknown): string {
  if (err instanceof WeatherError) return err.message;
  if (err instanceof Error) return err.message;
  return "Could not load weather";
}

export function WeatherModule({ data, onChange, leading, menu, className }: WeatherModuleProps) {
  const dataRef = useRef(data);
  dataRef.current = data;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const fetchGen = useRef(0);
  const pickingRef = useRef(false);

  const [picking, setPicking] = useState(!data.place);
  pickingRef.current = picking;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load once per place / new tab — do not depend on onChange identity (that caused fetch loops → 429).
  useEffect(() => {
    if (!data.place || picking) return;
    const place = data.place;
    const gen = ++fetchGen.current;
    let cancelled = false;

    void (async () => {
      try {
        const cache = await fetchWeather(place, { existing: dataRef.current.cache });
        if (cancelled || gen !== fetchGen.current || pickingRef.current) return;
        const prev = dataRef.current.cache;
        if (
          prev &&
          prev.fetchedAt === cache.fetchedAt &&
          prev.temperatureC === cache.temperatureC &&
          prev.weatherCode === cache.weatherCode
        ) {
          return;
        }
        onChangeRef.current({ ...dataRef.current, place, cache });
      } catch (err) {
        if (cancelled || gen !== fetchGen.current) return;
        setError(errMessage(err));
      }
    })();

    return () => {
      cancelled = true;
    };
    // intentionally only place coords + picking
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.place?.latitude, data.place?.longitude, picking]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      setSearching(true);
      void searchPlaces(q)
        .then((list) => {
          if (!cancelled) setResults(list);
        })
        .catch((err) => {
          if (!cancelled) {
            setResults([]);
            setError(errMessage(err));
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query]);

  async function refresh(place: WeatherPlace, force: boolean) {
    const gen = ++fetchGen.current;
    setLoading(true);
    setError("");
    try {
      const cache = await fetchWeather(place, {
        force,
        existing: force ? null : dataRef.current.cache,
      });
      if (gen !== fetchGen.current || pickingRef.current) return;
      onChangeRef.current({ ...dataRef.current, place, cache });
    } catch (err) {
      if (gen !== fetchGen.current) return;
      setError(errMessage(err));
    } finally {
      if (gen === fetchGen.current) setLoading(false);
    }
  }

  async function pickPlace(result: GeocodeResult) {
    const place: WeatherPlace = {
      name: result.name,
      country: result.country,
      latitude: result.latitude,
      longitude: result.longitude,
      admin1: result.admin1,
    };
    const gen = ++fetchGen.current;
    setQuery("");
    setResults([]);
    setError("");
    setLoading(true);
    pickingRef.current = false;
    setPicking(false);
    onChangeRef.current({ ...dataRef.current, place, cache: null });
    try {
      const cache = await fetchWeather(place, { force: true });
      if (gen !== fetchGen.current) return;
      onChangeRef.current({ ...dataRef.current, place, cache });
    } catch (err) {
      if (gen !== fetchGen.current) return;
      setError(errMessage(err));
    } finally {
      if (gen === fetchGen.current) setLoading(false);
    }
  }

  function startChangePlace() {
    fetchGen.current += 1;
    setLoading(false);
    setError("");
    setQuery("");
    setResults([]);
    pickingRef.current = true;
    setPicking(true);
  }

  function cancelChangePlace() {
    setQuery("");
    setResults([]);
    setError("");
    pickingRef.current = false;
    setPicking(false);
  }

  const showPicker = picking || !data.place;
  const Icon = data.cache ? KIND_ICON[weatherKind(data.cache.weatherCode)] : MapPin;
  const useC = data.celsius !== false;

  return (
    <Panel
      title={data.place?.name ?? "Weather"}
      icon={<Icon className="h-3.5 w-3.5" />}
      leading={leading}
      className={className}
      actions={
        <>
          {data.place && !showPicker ? (
            <button
              type="button"
              onClick={() => void refresh(data.place!, true)}
              disabled={loading}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground disabled:opacity-50 dark:hover:bg-white/10"
              aria-label="Refresh weather"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          ) : null}
          {menu}
        </>
      }
    >
      {showPicker ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <ModuleEmpty
            icon={MapPin}
            title={data.place ? "Change place" : "Choose a place"}
            hint="Search a city. Forecast from Open-Meteo — no account needed."
            className="py-4"
          />
          <PlaceSearch
            query={query}
            setQuery={setQuery}
            results={results}
            searching={searching}
            onPick={pickPlace}
          />
          {data.place ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="self-start"
              onClick={cancelChangePlace}
            >
              Cancel
            </Button>
          ) : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {data.cache ? (
            <div className="flex items-end justify-between gap-3 px-0.5">
              <div>
                <p className="font-clock text-4xl font-medium tabular-nums tracking-tight text-foreground">
                  {formatTemp(data.cache.temperatureC, useC)}
                </p>
                <p className="mt-1 text-sm text-foreground/80">
                  {weatherLabel(data.cache.weatherCode)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{placeLabel(data.place!)}</p>
              </div>
              <WeatherVisual kind={weatherKind(data.cache.weatherCode)} className="mb-0.5" />
            </div>
          ) : loading ? (
            <div className="flex flex-1 items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {error || "No forecast yet."}
            </p>
          )}

          {data.cache ? (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span>Humidity {Math.round(data.cache.humidity)}%</span>
              <span>Wind {Math.round(data.cache.windKmh)} km/h</span>
              {data.cache.precipProb != null ? (
                <span>Rain {Math.round(data.cache.precipProb)}%</span>
              ) : null}
              {data.cache.aqi != null ? <span>AQI {data.cache.aqi}</span> : null}
            </div>
          ) : null}

          {data.cache?.hourly && data.cache.hourly.length > 0 ? (
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {data.cache.hourly.slice(0, 8).map((h) => {
                const hour = h.time.slice(11, 16);
                return (
                  <div
                    key={h.time}
                    className="flex min-w-[2.75rem] flex-col items-center gap-0.5 rounded-md bg-black/[0.03] px-1.5 py-1 dark:bg-white/[0.04]"
                  >
                    <span className="text-[9px] tabular-nums text-muted-foreground">{hour}</span>
                    <span className="font-clock text-[11px] tabular-nums text-foreground/85">
                      {Math.round(data.celsius !== false ? h.tempC : (h.tempC * 9) / 5 + 32)}°
                    </span>
                    {h.precipProb > 0 ? (
                      <span className="text-[8px] tabular-nums text-sky-600/80 dark:text-sky-400/80">
                        {Math.round(h.precipProb)}%
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-black/6 pt-2 dark:border-white/8">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px]"
              onClick={() => onChange({ ...data, celsius: !useC })}
            >
              Show °{useC ? "F" : "C"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px]"
              onClick={startChangePlace}
            >
              Change place
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function PlaceSearch({
  query,
  setQuery,
  results,
  searching,
  onPick,
}: {
  query: string;
  setQuery: (q: string) => void;
  results: GeocodeResult[];
  searching: boolean;
  onPick: (r: GeocodeResult) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search city…"
          className="h-9 border-black/8 bg-black/[0.03] pr-8 text-sm dark:border-white/10 dark:bg-white/[0.04]"
          aria-label="Search city"
          autoFocus
        />
        {searching ? (
          <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      {results.length > 0 ? (
        <ul className="max-h-40 overflow-y-auto rounded-lg border border-black/8 dark:border-white/10">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onPick(r)}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                <span className="font-medium text-foreground">{r.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {[r.admin1, r.country].filter(Boolean).join(", ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
