"""Checks that the AI's quotes really are in the paper, word for word.

Each section's explanation comes with quotes the AI says it is based on. Here we look for
every quote in the text pulled out of the PDF itself (pdf_text.py). A quote that is found
gets verified=True and the page it was really on; one that isn't stays visible but
unverified, so the reader can tell the difference. This is plain Python, so it can't be
fooled the way a second AI check could.

PDF text is messy: words are split by hyphens at line ends, letters become ligatures (ﬁ),
quote marks curl, and many LaTeX papers come out with the spaces between words missing
("Mostcompetitiveneural...") or added inside them. So both sides are reduced to lowercase
letters and digits only, with no spaces at all, before comparing.
"""

import re
import unicodedata

_HYPHEN_BREAK = re.compile(r"(\w)-\s*\n\s*(\w)")
_NOT_WORD = re.compile(r"[^a-z0-9]+")

# Too short and a "quote" matches by accident; the AI is asked for 8 to 30 words.
MIN_WORDS = 5
MIN_LETTERS = 20


def _compact(text: str) -> str:
    return normalise(text).replace(" ", "")


def normalise(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = _HYPHEN_BREAK.sub(r"\1\2", text)
    return _NOT_WORD.sub(" ", text.lower()).strip()


def find_page(quote: str, pages: list[str], claimed_page: int) -> int | None:
    """The 1-based page the quote is on (the claimed page first, then its neighbours, then the
    rest), or None if it isn't in the paper's text."""
    if len(normalise(quote).split()) < MIN_WORDS:
        return None
    needle = _compact(quote)
    if len(needle) < MIN_LETTERS:
        return None
    count = len(pages)
    order = [claimed_page, claimed_page + 1, claimed_page - 1, *range(1, count + 1)]
    seen: set[int] = set()
    for page in order:
        if page in seen or not 1 <= page <= count:
            continue
        seen.add(page)
        if needle in _compact(pages[page - 1]):
            return page
    # A quote that runs over a page break.
    joined = _compact(" ".join(pages))
    if needle in joined:
        return claimed_page if 1 <= claimed_page <= count else None
    return None


def find_caption(label: str, caption: str, pages: list[str], claimed_page: int) -> int | None:
    """Like find_page, for a figure caption. Captions are often short ("The Transformer - model
    architecture."), so the label in front of them ("Figure 1:") is searched too."""
    return find_page(f"{label} {caption}", pages, claimed_page) or find_page(caption, pages, claimed_page)
