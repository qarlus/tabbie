"""
Distinctive CapTab surface tiles — each has a clear material identity.

Greyscale luminance only; CSS mix-blend + theme wash colour them.
Tile sizes and CSS background-size must stay in sync (see index.css).

  python scripts/make_surfaces.py
"""

from __future__ import annotations

import math
import os
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "surfaces"

BAYER8 = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21],
]


def clamp(v: float, lo: float = 0.0, hi: float = 255.0) -> int:
    return int(max(lo, min(hi, round(v))))


def fade(t: float) -> float:
    return t * t * t * (t * (t * 6 - 15) + 10)


def save_l(img: Image.Image, path: Path) -> None:
    img = img.convert("L")
    img.save(path, optimize=True)
    print(f"  {path.name:16} {img.size[0]:>4}x{img.size[1]:<4} {os.path.getsize(path)/1024:5.1f} KB")


def value_noise(size: int, seed: int, grid: int) -> list[list[float]]:
    rng = random.Random(seed)
    cell = size / grid
    lattice = [[rng.random() for _ in range(grid + 1)] for _ in range(grid + 1)]
    for i in range(grid + 1):
        lattice[i][grid] = lattice[i][0]
        lattice[grid][i] = lattice[0][i]
    lattice[grid][grid] = lattice[0][0]
    out = [[0.0] * size for _ in range(size)]
    for y in range(size):
        gy = y / cell
        y0, ty = int(gy) % grid, fade(gy - int(gy))
        y1 = (y0 + 1) % grid
        for x in range(size):
            gx = x / cell
            x0, tx = int(gx) % grid, fade(gx - int(gx))
            x1 = (x0 + 1) % grid
            n00, n10 = lattice[y0][x0], lattice[y0][x1]
            n01, n11 = lattice[y1][x0], lattice[y1][x1]
            out[y][x] = (n00 + (n10 - n00) * tx) * (1 - ty) + (n01 + (n11 - n01) * tx) * ty
    return out


# ---------------------------------------------------------------------------
# GRAIN — Tri-X style: sharp fine grain + sparse larger silver flecks
# ---------------------------------------------------------------------------

def make_grain() -> None:
    size = 512
    rng = random.Random(12)
    img = Image.new("L", (size, size))
    fine = value_noise(size, 12, 96)
    mid = value_noise(size, 44, 48)

    for y in range(size):
        for x in range(size):
            # Fine grain dominates
            g = (fine[y][x] - 0.5) * 0.55
            # Occasional larger crystal
            m = (mid[y][x] - 0.5) * 0.12
            v = 0.5 + g + m
            img.putpixel((x, y), clamp(v * 255))

    # Sparse bright/dark flecks (film emulsion personality)
    px = img.load()
    for _ in range(1800):
        x, y = rng.randint(0, size - 1), rng.randint(0, size - 1)
        bump = rng.choice([-48, -32, 32, 48])
        px[x, y] = clamp(px[x, y] + bump)
        if rng.random() < 0.35:
            for dx, dy in ((1, 0), (0, 1), (-1, 0)):
                nx, ny = (x + dx) % size, (y + dy) % size
                px[nx, ny] = clamp(px[nx, ny] + bump // 2)

    save_l(img, OUT / "grain.png")


# ---------------------------------------------------------------------------
# DITHER — true Bayer screen at 1 cell = 1 CSS pixel (8×8 tile)
# ---------------------------------------------------------------------------

def make_dither() -> None:
    """8×8 Bayer threshold screen — must be CSS-tiled at 8×8 px."""
    img = Image.new("L", (8, 8))
    for y in range(8):
        for x in range(8):
            # Mid-grey screen: half the thresholds on
            img.putpixel((x, y), 255 if BAYER8[y][x] < 32 else 0)
    save_l(img, OUT / "dither.png")

    # 2× version for sharper retina (optional; CSS uses 8px)
    big = img.resize((16, 16), Image.Resampling.NEAREST)
    save_l(big, OUT / "dither-2x.png")


# ---------------------------------------------------------------------------
# STIPPLE — Poisson-disk ink dots (gallery print, not newspaper grid)
# ---------------------------------------------------------------------------

def make_stipple() -> None:
    """Jittered ink dots — gallery stipple, not a newspaper screen."""
    size = 512
    img = Image.new("L", (size, size), 248)
    draw = ImageDraw.Draw(img)
    rng = random.Random(21)
    density = value_noise(size, 9, 4)

    # Coarse grid + jitter (fast Poisson-ish look)
    step = 8
    for gy in range(0, size, step):
        for gx in range(0, size, step):
            if rng.random() < 0.12:
                continue
            jx = rng.uniform(-2.2, 2.2)
            jy = rng.uniform(-2.2, 2.2)
            x = (gx + step * 0.5 + jx) % size
            y = (gy + step * 0.5 + jy) % size
            d = density[int(y)][int(x)]
            if rng.random() > 0.35 + d * 0.55:
                continue
            r = 0.55 + d * 1.7 + rng.random() * 0.4
            ink = 22 + int(d * 55)
            draw.ellipse([x - r, y - r, x + r, y + r], fill=ink)

    save_l(img, OUT / "stipple.png")


# ---------------------------------------------------------------------------
# PAPER — cold-press watercolor: fibre clumps, almost invisible laid hint
# ---------------------------------------------------------------------------

def make_paper() -> None:
    size = 512
    img = Image.new("L", (size, size))
    a = value_noise(size, 3, 12)
    b = value_noise(size, 8, 40)
    c = value_noise(size, 15, 80)
    stretch_n = value_noise(size, 22, 60)

    for y in range(size):
        # Barely-there laid suggestion (not a grid!)
        laid = math.sin(y / 18.0 * math.pi) * 0.012
        for x in range(size):
            fibre = (a[y][x] - 0.5) * 0.1 + (b[y][x] - 0.5) * 0.18 + (c[y][x] - 0.5) * 0.22
            # Anisotropic stretch — fibres run mostly horizontal
            stretch = (stretch_n[y][(x * 2) % size] - 0.5) * 0.08
            v = 0.78 + fibre + stretch - laid
            img.putpixel((x, y), clamp(v * 255))

    # Soft pulp clumps
    rng = random.Random(4)
    overlay = Image.new("L", (size, size), 0)
    od = ImageDraw.Draw(overlay)
    for _ in range(40):
        cx, cy = rng.randint(0, size), rng.randint(0, size)
        rw, rh = rng.randint(18, 55), rng.randint(8, 22)
        od.ellipse([cx - rw, cy - rh, cx + rw, cy + rh], fill=rng.randint(8, 22))
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=7))
    base = img.load()
    ov = overlay.load()
    for y in range(size):
        for x in range(size):
            base[x, y] = clamp(base[x, y] - ov[x, y] * 0.45)

    save_l(img, OUT / "paper.png")


# ---------------------------------------------------------------------------
# HATCH — irregular pen hatching (editorial / engraving, not a mesh grid)
# ---------------------------------------------------------------------------

def make_hatch() -> None:
    size = 384
    img = Image.new("L", (size, size), 242)
    draw = ImageDraw.Draw(img)
    rng = random.Random(33)

    # Primary stroke family ~28°
    angle = math.radians(28)
    dx, dy = math.cos(angle), math.sin(angle)
    spacing = 9

    # Cover plane with parallel lines, jittered
    # Line equation: offset along perpendicular
    px, py = -dy, dx
    extent = size * 2
    for i in range(-extent, extent, spacing):
        ox = size / 2 + px * i + rng.uniform(-1.2, 1.2)
        oy = size / 2 + py * i + rng.uniform(-1.2, 1.2)
        # Break into ink segments (not continuous — hand-drawn)
        t = -extent
        while t < extent:
            seg = rng.uniform(18, 70)
            gap = rng.uniform(2, 10)
            x0 = ox + dx * t
            y0 = oy + dy * t
            x1 = ox + dx * (t + seg)
            y1 = oy + dy * (t + seg)
            # Wrap by drawing in tiles
            ink = rng.randint(55, 110)
            width = 1 if rng.random() > 0.15 else 1
            # Draw with slight wobble via mid control
            steps = max(2, int(seg / 4))
            pts = []
            for s in range(steps + 1):
                u = s / steps
                xt = x0 + (x1 - x0) * u + rng.uniform(-0.6, 0.6)
                yt = y0 + (y1 - y0) * u + rng.uniform(-0.6, 0.6)
                pts.append((xt % size, yt % size))
            # Segment may wrap — draw piecewise when jumps
            for a, b in zip(pts, pts[1:]):
                if abs(a[0] - b[0]) < size / 2 and abs(a[1] - b[1]) < size / 2:
                    draw.line([a, b], fill=ink, width=width)
            t += seg + gap

    # Sparse counter-hatch at 110° for depth (much lighter)
    angle2 = math.radians(110)
    dx2, dy2 = math.cos(angle2), math.sin(angle2)
    px2, py2 = -dy2, dx2
    for i in range(-extent, extent, spacing * 3):
        if rng.random() < 0.4:
            continue
        ox = size / 2 + px2 * i
        oy = size / 2 + py2 * i
        t = rng.uniform(-extent, extent)
        seg = rng.uniform(12, 40)
        pts = [
            ((ox + dx2 * t) % size, (oy + dy2 * t) % size),
            ((ox + dx2 * (t + seg)) % size, (oy + dy2 * (t + seg)) % size),
        ]
        if abs(pts[0][0] - pts[1][0]) < size / 2 and abs(pts[0][1] - pts[1][1]) < size / 2:
            draw.line(pts, fill=rng.randint(140, 180), width=1)

    img = img.filter(ImageFilter.GaussianBlur(radius=0.25))
    save_l(img, OUT / "hatch.png")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for stale in ("dither-fine.png", "dither-bayer.png", "dots.png", "mesh.png"):
        p = OUT / stale
        if p.exists():
            p.unlink()

    print(f"Writing surfaces -> {OUT.relative_to(ROOT)}")
    make_grain()
    make_dither()
    make_stipple()
    make_paper()
    make_hatch()
    print("Done.")


if __name__ == "__main__":
    main()
