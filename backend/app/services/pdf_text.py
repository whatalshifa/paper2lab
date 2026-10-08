"""Opens an uploaded PDF before any AI sees it: is it a real PDF, how many pages, and what text
is on each page (used later to check the AI's quotes)."""

import io
import logging

import pdfplumber

log = logging.getLogger(__name__)


class BadPDF(Exception):
    """A plain-words reason the file can't be used."""


def page_texts(data: bytes, max_pages: int) -> list[str]:
    """The text of every page, in order. Scanned papers give empty strings."""
    if not data.startswith(b"%PDF-"):
        raise BadPDF("That file isn't a PDF.")
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            if len(pdf.pages) == 0:
                raise BadPDF("That PDF has no pages.")
            if len(pdf.pages) > max_pages:
                raise BadPDF(
                    f"That PDF has {len(pdf.pages)} pages. Papers up to {max_pages} pages can be explained."
                )
            texts = []
            for page in pdf.pages:
                try:
                    texts.append(page.extract_text() or "")
                except Exception:  # one odd page shouldn't sink the whole paper
                    log.warning("Could not read the text of page %s", page.page_number, exc_info=True)
                    texts.append("")
            return texts
    except BadPDF:
        raise
    except Exception as exc:  # pdfminer raises many kinds of errors on broken files
        if "password" in str(exc).lower():
            raise BadPDF("That PDF is password-protected. Please upload an unlocked copy.") from exc
        raise BadPDF("That PDF couldn't be opened. It may be damaged.") from exc
