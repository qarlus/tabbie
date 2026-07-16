"""Generate Tabbie PNG icons — cute browser-tab mascot.

Run from repo root:
  python scripts/make_icons.py
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"

TEAL = (95, 143, 140, 255)
CREAM = (247, 244, 237, 255)
EAR = (197, 217, 195, 255)
INK = (47, 63, 69, 255)


def make_icon(size: int, path: Path) -> None:
    s = 512
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    def xy(n: float) -> float:
        return n * s / 64

    stroke = max(8, int(xy(2.0)))
    radius = int(xy(5.5))

    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(xy(14)), fill=TEAL)

    # Ears
    for cx in (20.0, 44.0):
        d.ellipse(
            [xy(cx - 7.2), xy(18.5 - 8.5), xy(cx + 7.2), xy(18.5 + 8.5)],
            fill=EAR,
            outline=INK,
            width=stroke,
        )

    # Cream body
    body = [xy(14), xy(24.3), xy(50), xy(50)]
    d.rounded_rectangle(body, radius=radius, fill=CREAM, outline=INK, width=stroke)

    # Tab notch on top (browser chrome lip) — cream pad overlapping the top edge
    d.rounded_rectangle(
        [xy(14), xy(21.2), xy(33.5), xy(28)],
        radius=int(xy(3.5)),
        fill=CREAM,
        outline=INK,
        width=stroke,
    )
    # Hide the inner double-stroke between lip and body
    d.rectangle([xy(14) + stroke, xy(24.3), xy(33.5) - stroke, xy(28)], fill=CREAM)

    # Window dots
    r = xy(1.55)
    for cx in (19.5, 24.0, 28.5):
        d.ellipse([xy(cx) - r, xy(24.8) - r, xy(cx) + r, xy(24.8) + r], fill=INK)

    # Eyes
    er = xy(2.35)
    for cx in (27.0, 37.0):
        d.ellipse([xy(cx) - er, xy(36.5) - er, xy(cx) + er, xy(36.5) + er], fill=INK)

    # Smile
    d.arc(
        [xy(27.5), xy(38.5), xy(36.5), xy(45.5)],
        start=25,
        end=155,
        fill=INK,
        width=max(6, int(xy(2.0))),
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
