"""Generate CapTab PNG icons — warm capybara-tab mascot.

Run from repo root:
  python scripts/make_icons.py
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"

TILE = (44, 34, 24, 255)  # #2C2218 warm charcoal
FUR = (196, 165, 116, 255)  # #C4A574 Capbar fur
INNER = (232, 196, 154, 255)  # #E8C49A
CREAM = (245, 240, 232, 255)  # #F5F0E8
STROKE = (92, 64, 48, 255)  # #5C4030
INK = (26, 20, 16, 255)  # #1A1410
BLUSH = (232, 160, 168, 178)
MUZZLE = (212, 165, 116, 140)  # #D4A574 soft


def make_icon(size: int, path: Path) -> None:
    s = 512
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    def xy(n: float) -> float:
        return n * s / 64

    stroke = max(8, int(xy(2.0)))
    radius = int(xy(5.5))

    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(xy(14)), fill=TILE)

    # Ears
    for cx in (20.0, 44.0):
        d.ellipse(
            [xy(cx - 7.4), xy(17.5 - 8.8), xy(cx + 7.4), xy(17.5 + 8.8)],
            fill=FUR,
            outline=STROKE,
            width=stroke,
        )
        d.ellipse(
            [xy(cx - 3.2), xy(18.2 - 4), xy(cx + 3.2), xy(18.2 + 4)],
            fill=INNER,
        )

    # Cream tab body
    body = [xy(14), xy(24.3), xy(50), xy(50)]
    d.rounded_rectangle(body, radius=radius, fill=CREAM, outline=STROKE, width=stroke)

    # Tab notch
    d.rounded_rectangle(
        [xy(14), xy(21.2), xy(33.5), xy(28)],
        radius=int(xy(3.5)),
        fill=CREAM,
        outline=STROKE,
        width=stroke,
    )
    d.rectangle([xy(14) + stroke, xy(24.3), xy(33.5) - stroke, xy(28)], fill=CREAM)

    # Window dots
    r = xy(1.55)
    for cx in (19.5, 24.0, 28.5):
        d.ellipse([xy(cx) - r, xy(24.8) - r, xy(cx) + r, xy(24.8) + r], fill=STROKE)

    # Blush
    for cx in (22.5, 41.5):
        d.ellipse(
            [xy(cx - 3.2), xy(38.5 - 1.8), xy(cx + 3.2), xy(38.5 + 1.8)],
            fill=BLUSH,
        )

    # Soft muzzle
    d.ellipse(
        [xy(32 - 6.5), xy(40.2 - 4.2), xy(32 + 6.5), xy(40.2 + 4.2)],
        fill=MUZZLE,
    )

    # Eyes
    er = xy(2.35)
    for cx in (27.0, 37.0):
        d.ellipse([xy(cx) - er, xy(36.2) - er, xy(cx) + er, xy(36.2) + er], fill=INK)

    # w-mouth (two small arcs)
    mouth_w = max(5, int(xy(1.8)))
    d.arc(
        [xy(26.5), xy(39.5), xy(33.5), xy(45.5)],
        start=20,
        end=160,
        fill=INK,
        width=mouth_w,
    )
    d.arc(
        [xy(30.5), xy(39.5), xy(37.5), xy(45.5)],
        start=20,
        end=160,
        fill=INK,
        width=mouth_w,
    )

    out = img.resize((size, size), Image.Resampling.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.save(path, optimize=True)
    print(f"wrote {path} ({size}x{size})")


def main() -> None:
    make_icon(32, PUBLIC / "icon-32.png")
    make_icon(128, PUBLIC / "icon-128.png")
    make_icon(512, PUBLIC / "icon-512.png")


if __name__ == "__main__":
    main()
