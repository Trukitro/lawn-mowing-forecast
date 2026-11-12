"""Generate PWA icons: green background, sun and grass blades. Usage: python scripts/make_icons.py Images/icons (needs Pillow)"""
import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw

out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)

BG = (46, 125, 50, 255)        # #2e7d32
SUN = (255, 205, 60, 255)
RAY = (255, 176, 32, 255)
GRASS = (170, 225, 120, 255)
GRASS_DARK = (120, 190, 80, 255)


def draw_icon(size, safe=1.0, rounded=True):
    """safe: fraction of the canvas used by the artwork (maskable icons need ~0.8)."""
    s = size * 4  # supersample
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=BG)
    else:
        d.rectangle([0, 0, s, s], fill=BG)

    art = s * safe
    off = (s - art) / 2
    u = art / 100  # artwork units

    def p(x, y):
        return (off + x * u, off + y * u)

    # Sun with rays
    cx, cy, r = 58, 38, 15
    for i in range(8):
        a = math.radians(i * 45)
        x1, y1 = p(cx + math.cos(a) * (r + 6), cy + math.sin(a) * (r + 6))
        x2, y2 = p(cx + math.cos(a) * (r + 14), cy + math.sin(a) * (r + 14))
        d.line([x1, y1, x2, y2], fill=RAY, width=int(5 * u))
    x0, y0 = p(cx - r, cy - r)
    x1, y1 = p(cx + r, cy + r)
    d.ellipse([x0, y0, x1, y1], fill=SUN)

    # Grass: a band of blades along the bottom
    base = 86
    blades = [(8, 62, GRASS_DARK), (18, 56, GRASS), (28, 64, GRASS_DARK), (38, 54, GRASS), (48, 62, GRASS_DARK),
              (58, 55, GRASS), (68, 63, GRASS_DARK), (78, 57, GRASS), (88, 64, GRASS_DARK)]
    for x, top, color in blades:
        d.polygon([p(x - 6, base), p(x + 1, top), p(x + 6, base)], fill=color)
    gx0, gy0 = p(2, base - 1)
    gx1, gy1 = p(98, base + 6)
    d.rounded_rectangle([gx0, gy0, gx1, gy1], radius=int(3 * u), fill=GRASS_DARK)

    return img.resize((size, size), Image.LANCZOS)


draw_icon(192).save(out / "icon-192.png")
draw_icon(512).save(out / "icon-512.png")
draw_icon(512, safe=0.72, rounded=False).save(out / "icon-maskable-512.png")
draw_icon(180, safe=0.86, rounded=False).save(out / "apple-touch-icon.png")
draw_icon(48).save(out / "favicon-48.png")
print("ok")
