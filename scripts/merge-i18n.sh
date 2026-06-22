#!/bin/bash
# scripts/merge-i18n.sh
#
# Merges per-page i18n TOML fragments (i18n-src/<lang>/*.toml)
# into single files Hugo expects (i18n/<lang>.toml).
#
# Used by: GitHub Actions (GitHub Pages deploy) and Cloudflare Pages build.
# Run from the repo root.

set -euo pipefail

SRC_DIR="i18n-src"
OUT_DIR="i18n"

if [ ! -d "$SRC_DIR" ]; then
  echo "Error: $SRC_DIR not found. Run this from the repo root." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

for lang_dir in "$SRC_DIR"/*/; do
  lang=$(basename "$lang_dir")
  out_file="$OUT_DIR/$lang.toml"

  {
    echo "# AUTO-GENERATED -- do not edit directly. Edit files in $SRC_DIR/$lang/ instead."

    shopt -s nullglob
    for f in "$lang_dir"*.toml; do
      echo ""
      echo "# --- from $(basename "$f") ---"
      cat "$f"
    done
    shopt -u nullglob
  } > "$out_file"

  count=$(find "$lang_dir" -maxdepth 1 -name "*.toml" | wc -l | tr -d ' ')
  echo "Merged $count file(s) -> $out_file"
done