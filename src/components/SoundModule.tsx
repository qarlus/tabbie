import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Panel } from "./Panel";

export type SoundTrack = "none" | "rain" | "cafe" | "forest";

export interface SoundData {
  track: SoundTrack;
  volume: number;
}

interface SoundModuleProps {
  data: SoundData;
  onChange: (next: SoundData) => void;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
  className?: string;
}

const TRACKS: { id: SoundTrack; label: string }[] = [
  { id: "none", label: "Off" },
  { id: "rain", label: "Rain" },
  { id: "cafe", label: "Café" },
  { id: "forest", label: "Forest" },
];

function createNoise(ctx: AudioContext, type: "white" | "brown"): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    if (type === "brown") {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = white * 0.4;
    }
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

export function SoundModule({ data, onChange, leading, menu, className }: SoundModuleProps) {
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode; filter?: BiquadFilterNode } | null>(
    null
  );
  const [playing, setPlaying] = useState(false);

  const stopAudio = useCallback(() => {
    const nodes = nodesRef.current;
    if (nodes) {
      try {
        nodes.source.stop();
        nodes.source.disconnect();
        nodes.gain.disconnect();
        nodes.filter?.disconnect();
      } catch {
        // already stopped
      }
      nodesRef.current = null;
    }
    setPlaying(false);
  }, []);

  const startTrack = useCallback(
    (track: SoundTrack, volume: number) => {
      stopAudio();
      if (track === "none") return;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = ctxRef.current ?? new AudioCtx();
      ctxRef.current = ctx;
      void ctx.resume();

      const noiseType = track === "rain" ? "white" : "brown";
      const source = createNoise(ctx, noiseType);
      const gain = ctx.createGain();
      gain.gain.value = volume;

      let filter: BiquadFilterNode | undefined;
      if (track === "rain") {
        filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 800;
        source.connect(filter);
        filter.connect(gain);
      } else if (track === "cafe") {
        filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 400;
        filter.Q.value = 0.6;
        source.connect(filter);
        filter.connect(gain);
      } else {
        filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 300;
        source.connect(filter);
        filter.connect(gain);
      }

      gain.connect(ctx.destination);
      source.start();
      nodesRef.current = { source, gain, filter };
      setPlaying(true);
    },
    [stopAudio]
  );

  useEffect(() => {
    return () => {
      stopAudio();
      void ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, [stopAudio]);

  useEffect(() => {
    if (!playing || !nodesRef.current) return;
    nodesRef.current.gain.gain.value = data.volume;
  }, [data.volume, playing]);

  function selectTrack(track: SoundTrack) {
    onChange({ ...data, track });
    if (track === "none") {
      stopAudio();
    }
  }

  function togglePlay() {
    if (data.track === "none") return;
    if (playing) {
      stopAudio();
    } else {
      startTrack(data.track, data.volume);
    }
  }

  return (
    <Panel
      title="Ambient"
      icon={<Volume2 className="h-3.5 w-3.5" />}
      leading={leading}
      className={cn("min-h-[10rem]", className)}
      actions={menu}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap gap-1">
          {TRACKS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTrack(t.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                data.track === t.id
                  ? "bg-foreground/[0.06] font-medium text-foreground dark:bg-white/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 w-8 shrink-0 p-0"
            disabled={data.track === "none"}
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Slider
            value={[Math.round(data.volume * 100)]}
            min={0}
            max={100}
            step={1}
            className="flex-1"
            onValueChange={(v) => onChange({ ...data, volume: (v[0] ?? 50) / 100 })}
            aria-label="Volume"
          />
          <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground">
            {Math.round(data.volume * 100)}%
          </span>
        </div>

        <p className="text-[10px] leading-relaxed text-muted-foreground/70">
          Soft generated noise — tap play after choosing a track (browser autoplay policy).
        </p>
      </div>
    </Panel>
  );
}

export function defaultSoundData(): SoundData {
  return { track: "none", volume: 0.35 };
}
