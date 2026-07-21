"""Generate a high-resolution SVG world map from Natural Earth topojson (110m)."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOPO = ROOT / "scripts" / "countries-110m.json"
OUT = ROOT / "assets" / "world-map.svg"

WIDTH = 4096
HEIGHT = 2048  # 2:1 equirectangular, 4K-friendly


def decode_arcs(topology):
    tr = topology.get("transform")
    sx = sy = 1.0
    tx = ty = 0.0
    if tr:
        sx, sy = tr["scale"]
        tx, ty = tr["translate"]

    decoded = []
    for arc in topology["arcs"]:
        x = y = 0
        coords = []
        for dx, dy in arc:
            x += dx
            y += dy
            coords.append((x * sx + tx, y * sy + ty))
        decoded.append(coords)
    return decoded


def arc_coords(topology, arc_ids):
    decoded = decode_arcs(topology)
    coords = []
    for i, arc_id in enumerate(arc_ids):
        reverse = arc_id < 0
        arc = decoded[~arc_id if reverse else arc_id]
        pts = list(reversed(arc)) if reverse else arc
        if i and coords and pts and coords[-1] == pts[0]:
            pts = pts[1:]
        coords.extend(pts)
    return coords


def ring_to_path(coords, width, height):
    if len(coords) < 2:
        return ""
    parts = []
    for lon, lat in coords:
        x = (lon + 180) / 360 * width
        y = (90 - lat) / 180 * height
        parts.append(f"{'M' if not parts else 'L'}{x:.2f},{y:.2f}")
    parts.append("Z")
    return " ".join(parts)


def geometry_to_paths(geom, topology, width, height):
    paths = []
    if geom["type"] == "Polygon":
        rings = geom["arcs"]
    elif geom["type"] == "MultiPolygon":
        rings = [r for poly in geom["arcs"] for r in poly]
    else:
        return paths

    for ring in rings:
        coords = arc_coords(topology, ring)
        path = ring_to_path(coords, width, height)
        if path:
            paths.append(path)
    return paths


def main():
    topo = json.loads(TOPO.read_text(encoding="utf-8"))
    countries = topo["objects"]["countries"]
    geoms = countries["geometries"]

    all_paths = []
    for geom in geoms:
        all_paths.extend(geometry_to_paths(geom, topo, WIDTH, HEIGHT))

    svg = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {HEIGHT}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">',
        f'  <g fill="#b8b8b8" stroke="none">',
    ]
    for d in all_paths:
        svg.append(f'    <path d="{d}"/>')
    svg.extend(["  </g>", "</svg>"])

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(svg), encoding="utf-8")
    print(f"Wrote {OUT} ({len(all_paths)} paths, {WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    main()
