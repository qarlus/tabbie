import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeatherKind } from "@/lib/weather";

interface WeatherVisualProps {
  kind: WeatherKind;
  className?: string;
}

/** Calm condition animation for the weather module. Respects prefers-reduced-motion via CSS. */
export function WeatherVisual({ kind, className }: WeatherVisualProps) {
  return (
    <div
      className={cn("weather-visual relative h-14 w-14 shrink-0", className)}
      aria-hidden
      data-kind={kind}
    >
      {kind === "clear" ? <ClearVisual /> : null}
      {kind === "cloud" ? <CloudVisual /> : null}
      {kind === "fog" ? <FogVisual /> : null}
      {kind === "rain" ? <RainVisual /> : null}
      {kind === "snow" ? <SnowVisual /> : null}
      {kind === "storm" ? <StormVisual /> : null}
    </div>
  );
}

function ClearVisual() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="weather-sun-glow absolute inset-1 rounded-full bg-ac/20" />
      <Sun className="weather-sun relative h-10 w-10 text-ac" strokeWidth={1.4} />
    </div>
  );
}

function CloudVisual() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <Cloud
        className="weather-drift absolute h-8 w-8 text-ac/35"
        strokeWidth={1.4}
        style={{ left: "8%", top: "28%" }}
      />
      <Cloud className="weather-drift-slow relative h-10 w-10 text-ac/80" strokeWidth={1.4} />
    </div>
  );
}

function FogVisual() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 overflow-hidden px-1">
      <span className="weather-fog-band weather-fog-1 h-1 w-10 rounded-full bg-ac/35" />
      <span className="weather-fog-band weather-fog-2 h-1 w-12 rounded-full bg-ac/25" />
      <span className="weather-fog-band weather-fog-3 h-1 w-9 rounded-full bg-ac/30" />
      <CloudFog className="weather-breathe mt-0.5 h-7 w-7 text-ac/70" strokeWidth={1.4} />
    </div>
  );
}

function RainVisual() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <CloudRain
        className="weather-drift-slow absolute left-1/2 top-1 h-8 w-8 -translate-x-1/2 text-ac/80"
        strokeWidth={1.4}
      />
      <span className="weather-drop weather-drop-1" />
      <span className="weather-drop weather-drop-2" />
      <span className="weather-drop weather-drop-3" />
      <span className="weather-drop weather-drop-4" />
    </div>
  );
}

function SnowVisual() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <CloudSnow
        className="weather-drift-slow absolute left-1/2 top-1 h-8 w-8 -translate-x-1/2 text-ac/80"
        strokeWidth={1.4}
      />
      <span className="weather-flake weather-flake-1" />
      <span className="weather-flake weather-flake-2" />
      <span className="weather-flake weather-flake-3" />
      <span className="weather-flake weather-flake-4" />
    </div>
  );
}

function StormVisual() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <Cloud
        className="weather-drift absolute h-9 w-9 text-ac/40"
        strokeWidth={1.4}
        style={{ top: "10%", left: "10%" }}
      />
      <CloudLightning className="weather-bolt relative h-10 w-10 text-ac/85" strokeWidth={1.4} />
    </div>
  );
}
