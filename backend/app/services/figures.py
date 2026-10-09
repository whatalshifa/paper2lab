"""Cuts a figure out of its PDF page as a picture, so it can sit next to its explanation.

Claude says roughly where each figure is on its page (top and bottom, as fractions of the page
height). That guess is checked against the PDF itself: if the caption's words can be found on
the page, the picture is stretched to include them, and if the guess is nowhere near the
caption, the caption's position wins. Figures usually sit above their caption and tables
below theirs. Finally, any drawing or image the cut slices through is taken in whole, so a
rough guess doesn't chop the top off a chart.

Pictures are made the first time someone opens them and then kept in storage.
"""

import hashlib
import io
import logging
import re
import unicodedata

import pdfplumber

log = logging.getLogger(__name__)

RESOLUTION = 144  # dots per inch: sharp on a phone, a few hundred KB per figure
PADDING = 6  # points of breathing room around the cut
NEAR = 0.15  # how far (as a fraction of the page) a guess may be from its caption and still count
REACH = 0.4  # how much of the page to show next to a caption when the guess is unusable
GROW = 0.25  # how far (as a fraction of the page) the cut may grow to take in a whole drawing


class FigureError(Exception):
    pass


def _caption_pattern(caption: str) -> str | None:
    """A pattern for the caption's first letters that allows any spaces or punctuation between
    them, because many PDFs come out with spaces lost or added (see quotes.py)."""
    letters = [c for c in unicodedata.normalize("NFKC", caption).lower() if c.isascii() and c.isalnum()][:30]
    if len(letters) < 12:
        return None
    return r"[\W_]*".join(re.escape(c) for c in letters)


def _caption_box(page, caption: str) -> tuple[float, float] | None:
    """Where the caption's first words are on the page (top and bottom, in points), if found."""
    pattern = _caption_pattern(caption)
    if pattern is None:
        return None
    try:
        matches = page.search(pattern, regex=True, case=False)
    except Exception:  # an odd page shouldn't stop the picture
        log.warning("Searching page %s for a caption failed", page.page_number, exc_info=True)
        return None
    if not matches:
        return None
    offset = float(page.bbox[1])  # positions are measured from the page's own top edge below
    return matches[0]["top"] - offset, matches[0]["bottom"] - offset


def _graphics(page) -> list[tuple[float, float]]:
    """The top and bottom of every drawing and image on the page, from the page's top edge."""
    offset = float(page.bbox[1])
    spans = []
    for item in [*page.rects, *page.lines, *page.curves, *page.images]:
        spans.append((float(item["top"]) - offset, float(item["bottom"]) - offset))
    return spans


def _take_in_whole(
    top: float, bottom: float, height: float, spans: list[tuple[float, float]], kind: str
) -> tuple[float, float]:
    """Grow the cut to include drawings it slices through, on the side away from the caption."""
    limit_top, limit_bottom = top - GROW * height, bottom + GROW * height
    for span_top, span_bottom in spans:
        if span_bottom - span_top > 0.9 * height:
            continue  # a frame around the whole page, not part of the figure
        if span_top < bottom and span_bottom > top:  # overlaps the cut
            if kind == "table":
                bottom = max(bottom, min(span_bottom, limit_bottom))
            else:
                top = min(top, max(span_top, limit_top))
    return top, bottom


def crop_box(
    figure: dict,
    height: float,
    caption: tuple[float, float] | None,
    spans: list[tuple[float, float]] | None = None,
) -> tuple[float, float]:
    """The part of the page to show, from top to bottom in points."""
    top, bottom = figure["top"] * height, figure["bottom"] * height
    if caption:
        caption_top, caption_bottom = caption
        near = NEAR * height
        if caption_bottom < top - near or caption_top > bottom + near:
            # The guess is far from the caption: trust the caption.
            if figure.get("kind") == "table":
                top, bottom = caption_top, caption_top + REACH * height
            else:
                top, bottom = caption_top - REACH * height, caption_bottom
        # A figure ends with its caption and a table starts with one, so the caption trims the cut.
        if figure.get("kind") == "table":
            top, bottom = caption_top, max(bottom, caption_bottom)
        else:
            top, bottom = min(top, caption_top), caption_bottom
    if spans:
        top, bottom = _take_in_whole(top, bottom, height, spans, figure.get("kind", "figure"))
    top, bottom = max(top - PADDING, 0.0), min(bottom + PADDING, height)
    return top, bottom


def render_figure(pdf: bytes, figure: dict) -> bytes:
    """A PNG of the figure's part of its page."""
    try:
        with pdfplumber.open(io.BytesIO(pdf)) as document:
            if not 1 <= figure["page"] <= len(document.pages):
                raise FigureError("That figure's page isn't in the PDF.")
            page = document.pages[figure["page"] - 1]
            caption = _caption_box(page, figure.get("caption", ""))
            top, bottom = crop_box(figure, float(page.height), caption, _graphics(page))
            cut = page.crop((0, top, float(page.width), bottom), relative=True, strict=False)
            image = cut.to_image(resolution=RESOLUTION).original
            out = io.BytesIO()
            image.convert("RGB").save(out, format="PNG", optimize=True)
            return out.getvalue()
    except FigureError:
        raise
    except Exception as exc:
        raise FigureError("That figure couldn't be drawn.") from exc


def figure_key(paper_id: str, figure: dict) -> str:
    """Where the picture is kept. The name changes if the figure's place changes (say, after the
    paper is read again), so an old picture is never shown for a new reading."""
    where = f"{figure['page']}|{figure['top']}|{figure['bottom']}|{figure.get('caption', '')}|{RESOLUTION}"
    digest = hashlib.sha256(where.encode()).hexdigest()[:12]
    return f"figures/{paper_id}/{figure['id']}-{digest}.png"
