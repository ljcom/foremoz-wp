#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$ROOT_DIR/04-build"
OUTPUT_PDF="${1:-$BUILD_DIR/foremoz-unified-whitepaper.pdf}"
PDF_ENGINE="${PDF_ENGINE:-/Library/TeX/texbin/xelatex}"
UNIFIED_MD_SCRIPT="$ROOT_DIR/scripts/generate_unified_markdown.py"

if ! command -v pandoc >/dev/null 2>&1; then
  echo "Error: pandoc tidak ditemukan. Install dulu: brew install pandoc" >&2
  exit 1
fi

if [[ ! -x "$PDF_ENGINE" ]]; then
  echo "Error: PDF_ENGINE tidak valid atau tidak executable: $PDF_ENGINE" >&2
  echo "Set path valid, contoh:" >&2
  echo "  PDF_ENGINE=/Library/TeX/texbin/xelatex ./paper/build.sh" >&2
  exit 1
fi

mkdir -p "$BUILD_DIR"

if [[ ! -f "$UNIFIED_MD_SCRIPT" ]]; then
  echo "Error: generator markdown tidak ditemukan: $UNIFIED_MD_SCRIPT" >&2
  exit 1
fi

generate_diagram_pngs() {
  mapfile -t mmd_files < <(find "$ROOT_DIR" -type f -name "*.mmd" | sort)
  if [[ "${#mmd_files[@]}" -eq 0 ]]; then
    return 0
  fi

  if ! command -v mmdc >/dev/null 2>&1; then
    echo "Error: mmdc tidak ditemukan. Install dulu: npm i -g @mermaid-js/mermaid-cli" >&2
    exit 1
  fi

  echo "Generating diagram PNG(s)..."
  for src in "${mmd_files[@]}"; do
    out="${src%.mmd}.png"
    mmdc -i "$src" -o "$out" -b transparent
    echo "  - $out"
  done
}

build_pdf() {
  local output_file="$1"
  local input_file="$2"
  local temp_tex
  local tex_stem
  local temp_pdf

  if [[ ! -f "$input_file" ]]; then
    echo "Error: file markdown gabungan tidak ditemukan: $input_file" >&2
    exit 1
  fi

  temp_tex="$(mktemp "$BUILD_DIR/unified.XXXXXX.tex")"
  tex_stem="$(basename "${temp_tex%.tex}")"
  temp_pdf="$BUILD_DIR/$tex_stem.pdf"

  pandoc \
    "$input_file" \
    --from markdown \
    --toc \
    --toc-depth=1 \
    --standalone \
    --resource-path="$ROOT_DIR" \
    --metadata title="Foremoz Unified Whitepaper" \
    --to=latex \
    -o "$temp_tex"

  "$PDF_ENGINE" -interaction=nonstopmode -halt-on-error -output-directory="$BUILD_DIR" "$temp_tex" >/dev/null
  "$PDF_ENGINE" -interaction=nonstopmode -halt-on-error -output-directory="$BUILD_DIR" "$temp_tex" >/dev/null

  mv "$temp_pdf" "$output_file"
  rm -f \
    "$temp_tex" \
    "$BUILD_DIR/$tex_stem.aux" \
    "$BUILD_DIR/$tex_stem.log" \
    "$BUILD_DIR/$tex_stem.out" \
    "$BUILD_DIR/$tex_stem.toc"

  echo "PDF berhasil dibuat: $output_file"
}

TEMP_MD="$(mktemp "$BUILD_DIR/unified.XXXXXX.md")"
trap 'rm -f "$TEMP_MD"' EXIT

generate_diagram_pngs
python3 "$UNIFIED_MD_SCRIPT" "$ROOT_DIR" "$TEMP_MD"
build_pdf "$OUTPUT_PDF" "$TEMP_MD"
