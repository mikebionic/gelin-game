"""
After background removal, find connected opaque components (= individual
sprites), trim each to its bounding box, drop tiny text fragments, and build a
numbered contact sheet so a human can pick which sprite index is which.

Usage:
    python3 tools/extract.py INPUT.jpeg OUTDIR --lum 200 --sat 0.18 \
        --min-area 1500 --contact contact.png
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
from bgremove import remove_bg


def label_components(mask):
    """Simple stack-based 4-connected labeling over foreground pixels."""
    h, w = mask.shape
    labels = np.zeros((h, w), dtype=np.int32)
    cur = 0
    ys, xs = np.nonzero(mask)
    fg = set(zip(ys.tolist(), xs.tolist()))
    visited = np.zeros((h, w), dtype=bool)
    comps = []
    for sy, sx in zip(ys.tolist(), xs.tolist()):
        if visited[sy, sx]:
            continue
        cur += 1
        stack = [(sy, sx)]
        visited[sy, sx] = True
        pix = []
        while stack:
            y, x = stack.pop()
            labels[y, x] = cur
            pix.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                    visited[ny, nx] = True
                    stack.append((ny, nx))
        comps.append(pix)
    return comps


def main():
    args = sys.argv[1:]
    inp, outdir = args[0], args[1]
    lum, sat, min_area = 200, 0.18, 1500
    contact = None
    i = 2
    while i < len(args):
        a = args[i]
        if a == "--lum": lum = int(args[i + 1]); i += 2
        elif a == "--sat": sat = float(args[i + 1]); i += 2
        elif a == "--min-area": min_area = int(args[i + 1]); i += 2
        elif a == "--contact": contact = args[i + 1]; i += 2
        else: i += 1

    os.makedirs(outdir, exist_ok=True)
    rgba = remove_bg(inp, lum, sat)
    arr = np.asarray(rgba)
    mask = arr[..., 3] > 0
    comps = label_components(mask)

    boxes = []
    for pix in comps:
        if len(pix) < min_area:
            continue
        yy = [p[0] for p in pix]; xx = [p[1] for p in pix]
        y0, y1, x0, x1 = min(yy), max(yy), min(xx), max(xx)
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        fill = len(pix) / (bw * bh)
        # drop extremely thin strips (leftover text lines / rules)
        if bw < 24 or bh < 24:
            continue
        boxes.append((y0, y1, x0, x1, len(pix), fill))

    # reading order: band by y (rows ~ figure height), then x
    boxes.sort(key=lambda b: (round(b[0] / 70), b[2]))

    crops = []
    for idx, (y0, y1, x0, x1, area, fill) in enumerate(boxes):
        sub = rgba.crop((x0, y0, x1 + 1, y1 + 1))
        path = os.path.join(outdir, f"{idx:02d}.png")
        sub.save(path)
        crops.append((idx, sub, area, (x0, y0, x1 - x0 + 1, y1 - y0 + 1)))
        print(f"{idx:02d} area={area} box=({x0},{y0},{x1-x0+1},{y1-y0+1}) fill={fill:.2f}")

    if contact and crops:
        try:
            from PIL import ImageFont
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26)
        except Exception:
            font = None
        cell = 200
        cols = 6
        rows = (len(crops) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * cell, rows * cell), (40, 30, 50))
        d = ImageDraw.Draw(sheet)
        for i, (idx, sub, area, box) in enumerate(crops):
            cx, cy = (i % cols) * cell, (i // cols) * cell
            s = sub.copy()
            s.thumbnail((cell - 24, cell - 42))
            sheet.paste(s, (cx + (cell - s.width) // 2, cy + 36 + (cell - 42 - s.height) // 2), s)
            d.rectangle([cx, cy, cx + cell - 1, cy + cell - 1], outline=(90, 80, 100))
            d.rectangle([cx, cy, cx + 54, cy + 32], fill=(20, 15, 25))
            d.text((cx + 6, cy + 2), f"{idx}", fill=(255, 220, 120), font=font)
        sheet.save(contact)
        print("contact:", contact, sheet.size)


if __name__ == "__main__":
    main()
