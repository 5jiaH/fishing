"""Merge sibling *.js river layers into one GeoJSON for the map viewer."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    import json5
except ImportError:
    print("请安装: pip install json5", file=sys.stderr)
    raise

_ROOT = Path(__file__).resolve().parent
NAME_DIR = _ROOT
ESTUARY_DIR = _ROOT.parent / "_入海河流"
OUT = NAME_DIR / "rivers-all.geojson"
OUT_ESTUARY = NAME_DIR / "estuary-rivers.geojson"
EXPORT_DEFAULT = re.compile(r"\bexport\s+default\s+")


def _append_geometry_features(
    features: list[dict], river_name: str, geom: dict | None
) -> None:
    if not geom:
        return
    gtype = geom.get("type")
    coords = geom.get("coordinates")
    if gtype == "MultiLineString" and isinstance(coords, list):
        for seg_in_river, line_coords in enumerate(coords):
            line_geom = {"type": "LineString", "coordinates": line_coords}
            fid = len(features)
            features.append(
                {
                    "type": "Feature",
                    "geometry": line_geom,
                    "properties": {
                        "name": river_name,
                        "seg": seg_in_river,
                        "fid": fid,
                    },
                }
            )
    else:
        fid = len(features)
        features.append(
            {
                "type": "Feature",
                "geometry": geom,
                "properties": {
                    "name": river_name,
                    "seg": 0,
                    "fid": fid,
                },
            }
        )


def _merge_js_rivers(src_dir: Path, features: list[dict]) -> None:
    for path in sorted(src_dir.glob("*.js")):
        text = path.read_text(encoding="utf-8")
        m = EXPORT_DEFAULT.search(text)
        if not m:
            continue
        payload = text[m.end() :].strip()
        if payload.endswith(";"):
            payload = payload[:-1].strip()
        try:
            data = json5.loads(payload)
        except Exception as e:
            print(f"跳过（解析失败）{path.name}: {e}", file=sys.stderr)
            continue

        river_name = str(data.get("name") or "").strip() or "(未命名)"

        if data.get("type") == "FeatureCollection":
            seg_in_river = 0
            for feat in data.get("features", []):
                geom = feat.get("geometry")
                if not geom:
                    continue
                fid = len(features)
                features.append(
                    {
                        "type": "Feature",
                        "geometry": geom,
                        "properties": {
                            "name": river_name,
                            "seg": seg_in_river,
                            "fid": fid,
                        },
                    }
                )
                seg_in_river += 1
            continue

        _append_geometry_features(features, river_name, data.get("geometry"))


def main() -> None:
    features: list[dict] = []
    _merge_js_rivers(NAME_DIR, features)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"wrote {OUT} with {len(features)} features")

    estuary_features: list[dict] = []
    if ESTUARY_DIR.is_dir():
        _merge_js_rivers(ESTUARY_DIR, estuary_features)
    OUT_ESTUARY.write_text(
        json.dumps({"type": "FeatureCollection", "features": estuary_features}, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"wrote {OUT_ESTUARY} with {len(estuary_features)} features")


if __name__ == "__main__":
    main()
