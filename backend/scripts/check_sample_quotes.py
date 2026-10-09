"""Checks the sample papers' quotes against the real PDFs on arXiv, and records the result.

The sample explanations were written in advance, so their quotes haven't been through the
automatic check that every uploaded paper gets. Run this from the backend folder on a
computer that can reach arxiv.org:

    python -m scripts.check_sample_quotes          # report only
    python -m scripts.check_sample_quotes --write  # also save the results

It downloads each sample's PDF and looks for every quote word for word (the same code the
app uses, quotes.py). With --write it fixes page numbers and sets "verified" in the files
in app/samples/, ready to commit. Any quote it couldn't find is listed so it can be
corrected by hand. CI runs the report on every change to the samples.
"""

import json
import sys

from app.services.arxiv import download_pdf
from app.services.pdf_text import page_texts
from app.services.quotes import find_page, normalise
from app.services.samples import sample_files


def _show_near(quote: str, pages: list[str], page: int) -> None:
    """Prints the PDF's own text where the quote's first words appear, to see how it differs."""
    start = normalise(quote).replace(" ", "")[:12]
    text = pages[page - 1] if 1 <= page <= len(pages) else ""
    compact = normalise(text).replace(" ", "")
    at = compact.find(start)
    if at < 0:
        print("    (its first words aren't on that page)")
    else:
        print(f"    the PDF has: {compact[at : at + 160]!r}")


def main(write: bool) -> int:
    missing = 0
    for path in sample_files():
        data = json.loads(path.read_text(encoding="utf-8"))
        print(f"{path.name}: downloading arXiv {data['arxiv_id']}")
        pages = page_texts(download_pdf(data["arxiv_id"], 50_000_000), max_pages=200)
        # How this PDF's text comes out, to see why a quote isn't found.
        print(f"  page 2 text starts: {pages[1][:160]!r}" if len(pages) > 1 else "  (one page)")
        data["page_count"] = len(pages)
        for section in data["reading"]["sections"]:
            for quote in section["quotes"]:
                page = find_page(quote["text"], pages, quote["page"])
                quote["verified"] = page is not None
                if page is None:
                    missing += 1
                    print(f"  NOT FOUND ({section['title']}): {quote['text']}")
                    _show_near(quote["text"], pages, quote["page"])
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
                        _show_near(cite["quote"], pages, cite["start_page"])
                    else:
                        print(f"  found on page {page} (said {cite['start_page']}): {cite['quote'][:60]}")
                        cite["start_page"] = cite["end_page"] = page
        if write:
            path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("All quotes found." if missing == 0 else f"{missing} quote(s) need fixing by hand.")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main(write="--write" in sys.argv))
