#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$ROOT_DIR/04-build"
OUTPUT_PDF="${1:-$BUILD_DIR/foremoz-unified-whitepaper.pdf}"
PDF_ENGINE="${PDF_ENGINE:-/Library/TeX/texbin/xelatex}"

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

SECTIONS=(
  "core"
  "industries/active"
  "industries/learning"
  "industries/performance"
  "industries/tourism"
  "passport"
  "gov"
  "creator-events"
)

collect_markdown_files() {
  local base_dir="$1"
  local whitepaper_dir="$ROOT_DIR/$base_dir/01-whitepaper"
  local diagram_dir="$ROOT_DIR/$base_dir/02-diagrams"

  if [[ -d "$whitepaper_dir" ]]; then
    find "$whitepaper_dir" -maxdepth 1 -type f -name "*.md" | sort | grep -v "/foremoz-event-os-whitepaper-v1.md$" || true
    if [[ -d "$whitepaper_dir/appendix" ]]; then
      find "$whitepaper_dir/appendix" -maxdepth 1 -type f -name "*.md" | sort
    fi
  fi

  if [[ -f "$diagram_dir/README.md" ]]; then
    echo "$diagram_dir/README.md"
  fi
}

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
  shift
  local files=("$@")

  if [[ "${#files[@]}" -eq 0 ]]; then
    echo "Error: tidak ada file markdown untuk dibuild." >&2
    exit 1
  fi

  pandoc \
    "${files[@]}" \
    --from markdown \
    --toc \
    --standalone \
    --resource-path="$ROOT_DIR" \
    --metadata title="Foremoz Unified Whitepaper" \
    --pdf-engine="$PDF_ENGINE" \
    -o "$output_file"

  echo "PDF berhasil dibuat: $output_file"
}

files=()
for section in "${SECTIONS[@]}"; do
  while IFS= read -r file; do
    files+=("$file")
  done < <(collect_markdown_files "$section")
done

generate_diagram_pngs
build_pdf "$OUTPUT_PDF" "${files[@]}"
