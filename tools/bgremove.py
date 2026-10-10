"""
Background remover for the concept/reference sheets.

The sheets have a near-white gridded background. A naive "make light pixels
transparent" would punch holes in light parts of the characters (white camera,
cream tunic, highlights). Instead we flood-fill the background starting from the
image borders, stopping at the dark character outlines. Light regions that are
fully enclosed by an outline are never reached, so they stay opaque.

Usage:
    python3 tools/bgremove.py INPUT OUTPUT [--preview PREVIEW] [--lum 200] [--sat 0.18]
"""
import sys
import numpy as np
from PIL import Image


def light_mask(arr, lum_thr, sat_thr):
    r = arr[..., 0].astype(np.int16)
    g = arr[..., 1].astype(np.int16)
    b = arr[..., 2].astype(np.int16)
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = (mx - mn) / (mx + 1.0)
    return (lum > lum_thr) & (sat < sat_thr)


def flood_from_border(light, max_iter=4000):
    """Multi-source vectorized BFS/dilation restricted to the light mask,
    seeded from every light pixel on the image border."""
    h, w = light.shape
    bg = np.zeros_like(light)
    bg[0, :] |= light[0, :]
    bg[-1, :] |= light[-1, :]
    bg[:, 0] |= light[:, 0]
    bg[:, -1] |= light[:, -1]
    for _ in range(max_iter):
        grown = bg.copy()
        grown[1:, :] |= bg[:-1, :]
        grown[:-1, :] |= bg[1:, :]
        grown[:, 1:] |= bg[:, :-1]
        grown[:, :-1] |= bg[:, 1:]
        grown &= light
        if np.array_equal(grown, bg):
            break
        bg = grown
    return bg


def remove_bg(path, lum_thr=200, sat_thr=0.18, feather=True):
    im = Image.open(path).convert("RGB")
    arr = np.asarray(im)
    light = light_mask(arr, lum_thr, sat_thr)
    bg = flood_from_border(light)
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    rgba = np.dstack([arr, alpha])
    out = Image.fromarray(rgba, "RGBA")
    return out


def preview_on(bg_rgba, color=(255, 0, 255)):
    bg = Image.new("RGBA", bg_rgba.size, color + (255,))
    bg.alpha_composite(bg_rgba)
    return bg.convert("RGB")


if __name__ == "__main__":
    args = sys.argv[1:]
    inp, outp = args[0], args[1]
    preview = None
    lum, sat = 200, 0.18
    i = 2
    while i < len(args):
        if args[i] == "--preview":
            preview = args[i + 1]; i += 2
        elif args[i] == "--lum":
            lum = int(args[i + 1]); i += 2
        elif args[i] == "--sat":
            sat = float(args[i + 1]); i += 2
        else:
            i += 1
    res = remove_bg(inp, lum, sat)
    res.save(outp)
    print("saved", outp, res.size)
    if preview:
        preview_on(res).save(preview)
        print("preview", preview)
