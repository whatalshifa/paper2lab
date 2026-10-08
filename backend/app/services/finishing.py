"""Turns Claude's reading into what we store and show, fixing anything that doesn't add up.

The schema guarantees the shape, not that the parts agree with each other. Here, in plain
Python: every quote is checked against the PDF (quotes.py), equation ids are made unique,
equations pointing at a section that doesn't exist are moved to the right one, and
"[e7]" references to equations that don't exist are dropped from the text, so the web
page never shows a broken link. Figure captions are checked like quotes, figure positions are
kept on the page, and the prerequisite map is made into a proper map: an idea can only build
on ideas listed before it, so it never goes round in a circle.
"""

import re

from app.services.quotes import find_page
from app.services.reader import Leveled, PaperReading

_EQ_REF = re.compile(r"\[(e\d+)\]")
_SAFE_ID = re.compile(r"[a-z][a-z0-9]{0,7}")  # figure ids end up in URLs and file names


def _drop_bad_refs(text: str, known: set[str]) -> str:
    return _EQ_REF.sub(lambda m: m.group(0) if m.group(1) in known else "", text)


def _leveled(value: Leveled, known: set[str]) -> dict[str, str]:
    return {level: _drop_bad_refs(text, known) for level, text in value.model_dump().items()}


MIN_HEIGHT = 0.08  # a figure region thinner than this is a bad guess, so the whole page is shown


def _region(top: float, bottom: float) -> tuple[float, float]:
    top, bottom = sorted((min(max(top, 0.0), 1.0), min(max(bottom, 0.0), 1.0)))
    if bottom - top < MIN_HEIGHT:
        return 0.0, 1.0
    return round(top, 3), round(bottom, 3)


def _prerequisites(reading: PaperReading) -> list[dict]:
    result = []
    seen: dict[str, int] = {}
    for index, item in enumerate(reading.prerequisites, start=1):
        topic = item.topic.strip()
        if not topic:
            continue
        item_id = item.id if item.id not in seen else f"p{index}"
        # Only ideas already listed count, which rules out loops and unknown ids.
        builds_on = list(dict.fromkeys(d for d in item.builds_on if d in seen))
        seen[item_id] = index
        result.append(
            {
                "id": item_id,
                "topic": topic,
                "primer": item.primer.strip(),
                "why": item.why.strip(),
                "builds_on": builds_on,
            }
        )
    return result


def finish(reading: PaperReading, pages: list[str]) -> dict:
    """The JSON stored in papers.reading. pages is the PDF's text, one string per page."""
    page_count = len(pages)

    def clamp(page: int) -> int:
        return min(max(page, 1), max(page_count, 1))

    sections = []
    seen_sections: set[str] = set()
    for index, section in enumerate(reading.sections, start=1):
        section_id = section.id if section.id not in seen_sections else f"s{index}"
        seen_sections.add(section_id)
        sections.append((section_id, section))

    equations = []
    seen_equations: set[str] = set()
    for index, equation in enumerate(reading.equations, start=1):
        equation_id = equation.id if equation.id not in seen_equations else f"e{index}"
        seen_equations.add(equation_id)
        equations.append((equation_id, equation))
    known = {equation_id for equation_id, _ in equations}

    figures = []
    seen_figures: set[str] = set()
    for index, figure in enumerate(reading.figures, start=1):
        safe = figure.id not in seen_figures and _SAFE_ID.fullmatch(figure.id)
        figure_id = figure.id if safe else f"f{index}"
        seen_figures.add(figure_id)
        figures.append((figure_id, figure))

    def section_for(equation_page: int, wanted: str) -> str | None:
        if wanted in seen_sections:
            return wanted
        # The last section that starts on or before the equation's page.
        best = sections[0][0] if sections else None
        for section_id, section in sections:
            if section.page <= equation_page:
                best = section_id
        return best

    has_text = any(text.strip() for text in pages)

    def check(quote) -> dict:
        found = find_page(quote.text, pages, quote.page) if has_text else None
        return {
            "page": found or clamp(quote.page),
            "text": quote.text.strip(),
            "verified": found is not None,
        }

    def figure_dict(figure_id: str, figure) -> dict:
        caption = figure.caption.strip()
        found = find_page(caption, pages, figure.page) if has_text and caption else None
        top, bottom = _region(figure.top, figure.bottom)
        return {
            "id": figure_id,
            "label": figure.label.strip() or f"Figure {figure_id[1:]}",
            "kind": figure.kind,
            "page": found or clamp(figure.page),
            "caption": caption,
            "caption_verified": found is not None,
            "top": top,
            "bottom": bottom,
            "explanation": _leveled(figure.explanation, known),
            "how_to_read": figure.how_to_read.strip(),
            "takeaway": figure.takeaway.strip(),
            "section_id": section_for(found or clamp(figure.page), figure.section_id),
        }

    return {
        "title": reading.title.strip(),
        "authors": [name.strip() for name in reading.authors if name.strip()],
        "year": reading.year,
        "field": reading.field.strip(),
        "summary": _leveled(reading.summary, known),
        "contributions": reading.contributions,
        "prerequisites": _prerequisites(reading),
        "sections": [
            {
                "id": section_id,
                "title": section.title.strip(),
                "page": clamp(section.page),
                "explanation": _leveled(section.explanation, known),
                "quotes": [check(quote) for quote in section.quotes],
            }
            for section_id, section in sections
        ],
        "equations": [
            {
                "id": equation_id,
                "number": equation.number,
                "name": equation.name.strip(),
                "latex": equation.latex.strip(),
                "in_words": _leveled(equation.in_words, known),
                "symbols": [symbol.model_dump() for symbol in equation.symbols],
                "section_id": section_for(equation.page, equation.section_id),
                "page": clamp(equation.page),
            }
            for equation_id, equation in equations
        ],
        "figures": [figure_dict(figure_id, figure) for figure_id, figure in figures],
        "concepts": [concept.model_dump() for concept in reading.concepts],
        "suggested_questions": [q.strip() for q in reading.suggested_questions if q.strip()][:4],
        "has_text_layer": has_text,
    }
