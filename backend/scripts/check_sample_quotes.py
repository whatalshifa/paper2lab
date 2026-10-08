"""Checks the sample papers' quotes against the real PDFs on arXiv, and records the result.

The sample explanations were written in advance, so their quotes haven't been through the
automatic check that every uploaded paper gets. Run this from the backend folder on a
computer that can reach arxiv.org:

    python -m scripts.check_sample_quotes          # report only
    python -m scripts.check_sample_quotes --write  # also save the results
    python -m scripts.check_sample_quotes --figures out/  # also save each figure's picture

It downloads each sample's PDF and looks for every quote and figure caption word for word (the same code the
app uses, quotes.py). With --write it fixes page numbers and sets "verified" in the files
in app/samples/, ready to commit. Any quote it couldn't find is listed so it can be
corrected by hand. CI runs the report on every change to the samples.
"""

import json
import sys
from pathlib import Path

from app.services.arxiv import download_pdf
from app.services.figures import render_figure
from app.services.pdf_text import page_texts
from app.services.quotes import find_page
from app.services.samples import sample_files


def main(write: bool, figures_dir: Path | None) -> int:
    missing = 0
    for path in sample_files():
        data = json.loads(path.read_text(encoding="utf-8"))
        print(f"{path.name}: downloading arXiv {data['arxiv_id']}")
        pdf = download_pdf(data["arxiv_id"], 50_000_000)
        pages = page_texts(pdf, max_pages=200)
        data["page_count"] = len(pages)
        for section in data["reading"]["sections"]:
            for quote in section["quotes"]:
                page = find_page(quote["text"], pages, quote["page"])
                quote["verified"] = page is not None
                if page is None:
                    missing += 1
                    print(f"  NOT FOUND ({section['title']}): {quote['text']}")
                else:
                    print(f"  found on page {page} (said {quote['page']}): {quote['text'][:60]}")
                    quote["page"] = page
        for prepared in data["reading"].get("prepared_answers", []):
            for part in prepared["parts"]:
                for cite in part["citations"]:
                    page = find_page(cite["quote"], pages, cite["start_page"])
                    cite["verified"] = page is not None
                    if page is None:
                        missing += 1
                        print(f"  NOT FOUND (answer to {prepared['question']!r}): {cite['quote']}")
                    else:
                        print(f"  found on page {page} (said {cite['start_page']}): {cite['quote'][:60]}")
                        cite["start_page"] = cite["end_page"] = page
        for figure in data["reading"].get("figures", []):
            page = find_page(figure["caption"], pages, figure["page"])
            figure["caption_verified"] = page is not None
            if page is None:
                missing += 1
                print(f"  CAPTION NOT FOUND ({figure['label']}): {figure['caption']}")
            else:
                print(f"  {figure['label']} caption found on page {page} (said {figure['page']})")
                figure["page"] = page
            if figures_dir:
                figures_dir.mkdir(parents=True, exist_ok=True)
                out = figures_dir / f"{path.stem}-{figure['id']}.png"
                out.write_bytes(render_figure(pdf, figure))
                print(f"    picture saved to {out}")
        if write:
            path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("All quotes and captions found." if missing == 0 else f"{missing} quote(s) need fixing by hand.")
    return 1 if missing else 0


if __name__ == "__main__":
    args = sys.argv[1:]
    folder = Path(args[args.index("--figures") + 1]) if "--figures" in args else None
    sys.exit(main(write="--write" in args, figures_dir=folder))
