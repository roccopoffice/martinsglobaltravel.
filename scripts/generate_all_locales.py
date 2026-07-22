#!/usr/bin/env python3
"""Generate full locale JSON trees from EN using Google Translate (cached, deduped)."""
from __future__ import annotations

import importlib.util
import json
import re
import sys
import time
from pathlib import Path

from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "i18n" / "generated"
BUILD = Path(__file__).resolve().parent / "build-i18n.py"

LANG_TARGETS = {
    "es": "es",
    "pt": "pt",
    "fr": "fr",
    "zh": "zh-CN",
    "ht": "ht",
    "kea": "pt",
}

SKIP_EXACT = {
    "Martins Global Travels",
    "Jeanie@MartinsGlobalTravels.com",
    "john@email.com",
    "John",
    "Smith",
    "(508) 555-1234",
    "FAQ",
    "Cookies",
}

HTML_TAG_RE = re.compile(r"(<[^>]+>)")


def log(msg: str) -> None:
    print(msg, flush=True)


def load_build():
    spec = importlib.util.spec_from_file_location("build_i18n", BUILD)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def flatten(d: dict, prefix: str = "") -> dict[str, str]:
    out: dict[str, str] = {}
    for k, v in d.items():
        p = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, p))
        else:
            out[p] = v
    return out


def unflatten(flat: dict[str, str]) -> dict:
    root: dict = {}
    for path, value in flat.items():
        parts = path.split(".")
        node = root
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = value
    return root


def should_skip(text: str, path: str) -> bool:
    if text in SKIP_EXACT:
        return True
    if path.endswith(".name") and path.startswith("dest.cards."):
        return True
    if path.endswith("mqItaly") or path.endswith("mqChina") or path.endswith("mqPortugal"):
        return path.endswith("Title") is False and path.split(".")[-1].startswith("mq")
    return False


def protect_html(text: str) -> tuple[str, list[str]]:
    parts = HTML_TAG_RE.split(text)
    tokens: list[str] = []
    out: list[str] = []
    for part in parts:
        if part.startswith("<") and part.endswith(">"):
            token = f"__HTML{len(tokens)}__"
            tokens.append(part)
            out.append(token)
        else:
            out.append(part)
    return "".join(out), tokens


def restore_html(text: str, tokens: list[str]) -> str:
    for i, tag in enumerate(tokens):
        text = text.replace(f"__HTML{i}__", tag)
    return text


def translate_batch(unique: list[str], target: str, cache: dict) -> None:
    todo = [t for t in unique if f"{target}\0{t}" not in cache]
    log(f"  {len(todo)} new strings to translate (target={target})")
    for i, text in enumerate(todo):
        protected, tokens = protect_html(text)
        try:
            result = GoogleTranslator(source="en", target=target).translate(protected)
            result = restore_html(result, tokens)
        except Exception as exc:
            log(f"  warn: {exc!r} for {text[:40]!r}")
            result = text
        cache[f"{target}\0{text}"] = result
        if (i + 1) % 25 == 0:
            log(f"  ... {i + 1}/{len(todo)}")
            time.sleep(0.5)
        else:
            time.sleep(0.08)


def build_locale(en: dict, lang: str, google_target: str, cache: dict) -> dict:
    flat = flatten(en)
    skip_paths = {p for p, v in flat.items() if should_skip(v, p)}
    unique = sorted({v for p, v in flat.items() if p not in skip_paths})
    translate_batch(unique, google_target, cache)
    out_flat: dict[str, str] = {}
    for path, value in flat.items():
        if path in skip_paths:
            out_flat[path] = value
        else:
            out_flat[path] = cache.get(f"{google_target}\0{value}", value)
    return unflatten(out_flat)


def main():
    mod = load_build()
    en = mod.build_en()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = OUT_DIR / "_cache.json"
    cache = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}

    for lang, google_target in LANG_TARGETS.items():
        out_path = OUT_DIR / f"{lang}.json"
        if out_path.exists():
            log(f"Skip {lang} (exists)")
            continue
        log(f"Translating {lang} via {google_target}...")
        tree = build_locale(en, lang, google_target, cache)
        out_path.write_text(json.dumps(tree, ensure_ascii=False, indent=2), encoding="utf-8")
        cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
        log(f"Wrote {out_path} ({out_path.stat().st_size} bytes)")

    cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
    log("Done.")


if __name__ == "__main__":
    main()
