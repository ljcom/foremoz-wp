#!/usr/bin/env python3

from __future__ import annotations

import re
import sys
import unicodedata
from pathlib import Path


SECTIONS = [
    ("core", "Core"),
    ("industries/active", "Active"),
    ("industries/learning", "Learning"),
    ("industries/performance", "Performance"),
    ("industries/tourism", "Tourism"),
    ("passport", "Passport"),
    ("gov", "Gov"),
]

EXCLUDED_FILES = {"foremoz-event-os-whitepaper-v1.md"}
HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")


def collect_markdown_files(root_dir: Path, base_dir: str) -> list[Path]:
    whitepaper_dir = root_dir / base_dir / "01-whitepaper"
    diagram_dir = root_dir / base_dir / "02-diagrams"
    files: list[Path] = []

    if whitepaper_dir.is_dir():
        files.extend(
            sorted(
                path
                for path in whitepaper_dir.glob("*.md")
                if path.name not in EXCLUDED_FILES
            )
        )
        appendix_dir = whitepaper_dir / "appendix"
        if appendix_dir.is_dir():
            files.extend(sorted(appendix_dir.glob("*.md")))

    diagram_readme = diagram_dir / "README.md"
    if diagram_readme.is_file():
        files.append(diagram_readme)

    return files


def strip_heading_markup(text: str) -> str:
    text = re.sub(r"\s+\{[^}]*\}\s*$", "", text).strip()
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"[*_~]+", "", text)
    return text.strip()


def slugify(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", strip_heading_markup(text))
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")
    return slug or "section"


def unique_id(base: str, seen: set[str]) -> str:
    candidate = base
    counter = 2
    while candidate in seen:
        candidate = f"{base}-{counter}"
        counter += 1
    seen.add(candidate)
    return candidate


def rewrite_section_files(files: list[Path], section_slug: str, seen_ids: set[str]) -> tuple[list[str], list[tuple[int, str, str]]]:
    output_lines: list[str] = []
    toc_entries: list[tuple[int, str, str]] = []

    for file_path in files:
        if output_lines and output_lines[-1] != "":
            output_lines.append("")

        for raw_line in file_path.read_text().splitlines():
            match = HEADING_RE.match(raw_line)
            if not match:
                output_lines.append(raw_line)
                continue

            original_level = len(match.group(1))
            level = min(original_level + 1, 6)
            title = strip_heading_markup(match.group(2))
            heading_id = unique_id(f"{section_slug}-{slugify(title)}", seen_ids)
            if output_lines and output_lines[-1] != "":
                output_lines.append("")
            output_lines.append(f"{'#' * level} {title} {{#{heading_id}}}")
            toc_entries.append((level, title, heading_id))

    return output_lines, toc_entries


def render_section(
    section_title: str,
    files: list[Path],
    seen_ids: set[str],
    add_page_break: bool,
) -> list[str]:
    section_slug = slugify(section_title)
    section_id = unique_id(f"section-{section_slug}", seen_ids)
    content_lines, toc_entries = rewrite_section_files(files, section_slug, seen_ids)

    lines: list[str] = []
    if add_page_break:
        lines.extend(
            [
                "```{=latex}",
                "\\clearpage",
                "```",
                "",
            ]
        )

    lines.extend(
        [
            f"# {section_title} {{#{section_id}}}",
            "",
            "## Daftar Isi Section",
            "",
        ]
    )

    if toc_entries:
        for level, title, heading_id in toc_entries:
            if level > 3:
                continue
            indent = "  " * (level - 2)
            lines.append(f"{indent}- [{title}](#{heading_id})")
    else:
        lines.append("- Section ini belum memiliki heading.")

    lines.extend(["", *content_lines, ""])
    return lines


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: generate_unified_markdown.py <root_dir> <output_file>", file=sys.stderr)
        return 1

    root_dir = Path(sys.argv[1]).resolve()
    output_file = Path(sys.argv[2]).resolve()

    seen_ids: set[str] = set()
    lines: list[str] = []

    included_sections = []
    for base_dir, section_title in SECTIONS:
        files = collect_markdown_files(root_dir, base_dir)
        if not files:
            continue
        included_sections.append((section_title, files))

    for index, (section_title, files) in enumerate(included_sections):
        lines.extend(
            render_section(
                section_title,
                files,
                seen_ids,
                add_page_break=index > 0,
            )
        )

    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text("\n".join(lines).rstrip() + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
