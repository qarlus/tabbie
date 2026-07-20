/**
 * Open-Meteo weather helpers — no API key required.
 * https://open-meteo.com/
 *
 * Requests are coalesced per place and short-TTL cached in memory so
 * new-tab remounts / React effect churn don’t trip rate limits (429).
 */

export interface WeatherPlace {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  admin1?: string;
}

export interface WeatherSnapshot {
  temperatureC: number;
  weatherCode: number;
  humidity: number;
  windKmh: number;
  fetchedAt: number;
  /** Current-hour precipitation probability (0–100). */
  precipProb?: number;
  /** Next hours forecast. */
  hourly?: {
    time: string;
    tempC: number;
    precipProb: number;
    weatherCode: number;
  }[];
  /** US AQI when available from Open-Meteo air quality API. */
  aqi?: number | null;
}

export interface GeocodeResult {
  id: number;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  admin1?: string;
}

/** Skip the network if we fetched this place within this window. */
export const WEATHER_FRESH_MS = 5 * 60 * 1000;

const WMO_LABELS: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Icy fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Showers",
  81: "Showers",
  82: "Heavy showers",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Thunderstorm",
};

const memoryCache = new Map<string, WeatherSnapshot>();
const inflight = new Map<string, Promise<WeatherSnapshot>>();

export function weatherLabel(code: number): string {
  return WMO_LABELS[code] ?? "Conditions";
}

/** Rough icon key for UI (lucide mapping happens in the module). */
export type WeatherKind = "clear" | "cloud" | "fog" | "rain" | "snow" | "storm";

export function weatherKind(code: number): WeatherKind {
  if (code === 0 || code === 1) return "clear";
  if (code === 2 || code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 95) return "storm";
  if (code >= 51) return "rain";
  return "cloud";
}

export function placeKey(place: Pick<WeatherPlace, "latitude" | "longitude">): string {
  return `${place.latitude.toFixed(3)},${place.longitude.toFixed(3)}`;
}

export function placeLabel(place: Pick<WeatherPlace, "name" | "admin1" | "country">): string {
  return [place.name, place.admin1, place.country].filter(Boolean).join(", ");
}

export class WeatherError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", q);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  const res = await fetch(url);
  if (res.status === 429) {
    throw new WeatherError("Place search is rate-limited — wait a moment and try again.", 429);
  }
  if (!res.ok) throw new WeatherError(`Place search failed (${res.status})`, res.status);
  const data = (await res.json()) as {
    results?: {
      id: number;
      name: string;
      country_code?: string;
      country?: string;
      latitude: number;
      longitude: number;
      admin1?: string;
    }[];
  };
  return (data.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    country: r.country ?? r.country_code ?? "",
    latitude: r.latitude,
    longitude: r.longitude,
    admin1: r.admin1,
  }));
}

async function fetchAirQuality(
  place: WeatherPlace
): Promise<number | null> {
  try {
    const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    url.searchParams.set("latitude", String(place.latitude));
    url.searchParams.set("longitude", String(place.longitude));
    url.searchParams.set("current", "us_aqi");
    url.searchParams.set("timezone", "auto");
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { current?: { us_aqi?: number } };
    const aqi = data.current?.us_aqi;
    return typeof aqi === "number" ? aqi : null;
  } catch {
    return null;
  }
}

async function fetchWeatherNetwork(place: WeatherPlace): Promise<WeatherSnapshot> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(place.latitude));
  url.searchParams.set("longitude", String(place.longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m"
  );
  url.searchParams.set("hourly", "temperature_2m,precipitation_probability,weather_code");
  url.searchParams.set("forecast_hours", "12");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("timezone", "auto");
  const [res, aqi] = await Promise.all([fetch(url), fetchAirQuality(place)]);
  if (res.status === 429) {
    throw new WeatherError("Weather is rate-limited — try again in a minute.", 429);
  }
  if (!res.ok) throw new WeatherError(`Weather fetch failed (${res.status})`, res.status);
  const data = (await res.json()) as {
    current?: {
      temperature_2m?: number;
      relative_humidity_2m?: number;
      weather_code?: number;
      wind_speed_10m?: number;
      time?: string;
    };
    hourly?: {
      time?: string[];
      temperature_2m?: number[];
      precipitation_probability?: number[];
      weather_code?: number[];
    };
  };
  const c = data.current;
  if (!c || typeof c.temperature_2m !== "number") {
    throw new WeatherError("Weather response was incomplete");
  }

  const times = data.hourly?.time ?? [];
  const temps = data.hourly?.temperature_2m ?? [];
  const precips = data.hourly?.precipitation_probability ?? [];
  const codes = data.hourly?.weather_code ?? [];
  const hourly = times.slice(0, 12).map((time, i) => ({
    time,
    tempC: temps[i] ?? 0,
    precipProb: precips[i] ?? 0,
    weatherCode: codes[i] ?? 0,
  }));

  let precipProb: number | undefined;
  if (c.time && hourly.length > 0) {
    const idx = times.indexOf(c.time);
    if (idx >= 0) precipProb = precips[idx];
    else precipProb = precips[0];
  } else if (precips.length > 0) {
    precipProb = precips[0];
  }

  return {
    temperatureC: c.temperature_2m,
    weatherCode: c.weather_code ?? 0,
    humidity: c.relative_humidity_2m ?? 0,
    windKmh: c.wind_speed_10m ?? 0,
    fetchedAt: Date.now(),
    precipProb,
    hourly,
    aqi,
  };
}

/**
 * Fetch current conditions for a place.
 * - Reuses in-flight requests for the same coordinates
 * - Returns a memory-cached snapshot if fresher than WEATHER_FRESH_MS (unless force)
 * - Also accepts an optional module cache to avoid network when still fresh
 */
export async function fetchWeather(
  place: WeatherPlace,
  options?: { force?: boolean; existing?: WeatherSnapshot | null }
): Promise<WeatherSnapshot> {
  const key = placeKey(place);
  const force = options?.force === true;

  if (!force) {
    const existing = options?.existing;
    if (existing && Date.now() - existing.fetchedAt < WEATHER_FRESH_MS) {
      memoryCache.set(key, existing);
      return existing;
    }
    const mem = memoryCache.get(key);
    if (mem && Date.now() - mem.fetchedAt < WEATHER_FRESH_MS) {
      return mem;
    }
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const request = fetchWeatherNetwork(place)
    .then((snap) => {
      memoryCache.set(key, snap);
      return snap;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}
