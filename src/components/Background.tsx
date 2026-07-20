import { surfaceById, type SurfaceId } from "@/lib/look";
import { dailyPhotoUrl } from "@/lib/photos";
import { wallpaperById, type WallpaperId } from "@/lib/scene";

interface BackgroundProps {
  surface?: SurfaceId;
  wallpaper?: WallpaperId;
  customWallpaperDataUrl?: string;
}

/**
 * Scenic wallpaper (optional) + theme wash + greyscale surface tile.
 * Wallpaper sits under a soft veil so modules stay readable.
 */
export function Background({
  surface = "grain",
  wallpaper = "riverside",
  customWallpaperDataUrl = "",
}: BackgroundProps) {
  const def = surfaceById(surface);
  const scene = wallpaperById(wallpaper);

  const customUrl = customWallpaperDataUrl.trim();
  const dailyUrl = wallpaper === "daily" ? dailyPhotoUrl() : undefined;
  const localUrl = scene.src;
  const imageUrl = customUrl || dailyUrl || localUrl;
  const hasWallpaper = !!imageUrl;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[hsl(var(--page-bg))]" />

      {hasWallpaper ? (
        <>
          <div
            className="captab-wallpaper absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
          <div className="captab-wallpaper-veil absolute inset-0" />
        </>
      ) : null}

      <div className={hasWallpaper ? "captab-wash captab-wash-over-photo" : "captab-wash"} />
      <div className="captab-accent-glow" />
      {def.tile ? (
        <div
          className={`captab-surface captab-surface-${def.id}`}
          style={{
            backgroundImage: `url(${def.tile})`,
            backgroundSize: def.tileSize,
          }}
        />
      ) : null}
    </div>
  );
}
