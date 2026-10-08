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
from app.services.quotes import find_page
from app.services.samples import sample_files


def main(write: bool) -> int:
    missing = 0
    for path in sample_files():
        data = json.loads(path.read_text(encoding="utf-8"))
        print(f"{path.name}: downloading arXiv {data['arxiv_id']}")
        pages = page_texts(download_pdf(data["arxiv_id"], 50_000_000), max_pages=200)
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
        if write:
            path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("All quotes found." if missing == 0 else f"{missing} quote(s) need fixing by hand.")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main(write="--write" in sys.argv))
