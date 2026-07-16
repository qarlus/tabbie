import { surfaceById, type SurfaceId } from "@/lib/look";

interface BackgroundProps {
  surface?: SurfaceId;
}

/**
 * Theme wash + optional greyscale surface tile.
 * Each surface tile is authored for a specific repeat size (see look.ts).
 */
export function Background({ surface = "grain" }: BackgroundProps) {
  const def = surfaceById(surface);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[hsl(var(--page-bg))]" />
      <div className="tabbie-wash" />
      <div className="tabbie-accent-glow" />
      {def.tile ? (
        <div
          className={`tabbie-surface tabbie-surface-${def.id}`}
          style={{
            backgroundImage: `url(${def.tile})`,
            backgroundSize: def.tileSize,
          }}
        />
      ) : null}
    </div>
  );
}
