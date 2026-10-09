"""Turns Claude's reading into what we store and show, fixing anything that doesn't add up.

The schema guarantees the shape, not that the parts agree with each other. Here, in plain
Python: every quote is checked against the PDF (quotes.py), equation ids are made unique,
equations pointing at a section that doesn't exist are moved to the right one, and
"[e7]" references to equations that don't exist are dropped from the text, so the web
page never shows a broken link.
"""

import re

from app.services.quotes import find_page
from app.services.reader import Leveled, PaperReading

_EQ_REF = re.compile(r"\[(e\d+)\]")


def _drop_bad_refs(text: str, known: set[str]) -> str:
    return _EQ_REF.sub(lambda m: m.group(0) if m.group(1) in known else "", text)


def _leveled(value: Leveled, known: set[str]) -> dict[str, str]:
    return {level: _drop_bad_refs(text, known) for level, text in value.model_dump().items()}


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

    return {
        "title": reading.title.strip(),
        "authors": [name.strip() for name in reading.authors if name.strip()],
        "year": reading.year,
        "field": reading.field.strip(),
        "summary": _leveled(reading.summary, known),
        "contributions": reading.contributions,
        "prerequisites": reading.prerequisites,
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
        "concepts": [concept.model_dump() for concept in reading.concepts],
        "suggested_questions": [q.strip() for q in reading.suggested_questions if q.strip()][:4],
        "has_text_layer": has_text,
    }
