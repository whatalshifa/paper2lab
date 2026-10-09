"""How often Paper2Lab's quotes and captions are found word for word in the PDF, across every paper.

This is the public answer to "why should I trust it?". Every quote an explanation leans on,
and every figure caption, is checked against the PDF's own text when the paper is read
(quotes.py), and the result is stored with the reading. Here those checks are counted.
Only counts leave the server: other people's papers are never named, only the samples.

Counting means loading every reading, so the report is kept for a few minutes.
"""

import time
from collections import Counter
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Paper

CACHE_SECONDS = 600

_cache: dict[str, Any] = {}


def tally(reading: dict[str, Any]) -> dict[str, int]:
    quotes = [quote for section in reading.get("sections", []) for quote in section.get("quotes", [])]
    figures = [figure for figure in reading.get("figures") or [] if figure.get("caption")]
    return {
        "quotes": len(quotes),
        "quotes_found": sum(1 for quote in quotes if quote.get("verified")),
        "captions": len(figures),
        "captions_found": sum(1 for figure in figures if figure.get("caption_verified")),
    }


def build_report(session: Session) -> dict[str, Any]:
    rows = session.execute(
        select(Paper.id, Paper.title, Paper.is_sample, Paper.reading).where(Paper.status == "ready")
    ).all()
    totals: Counter[str] = Counter()
    papers = scanned = 0
    samples = []
    for paper_id, title, is_sample, reading in rows:
        if not reading:
            continue
        if reading.get("has_text_layer") is False:
            # A scanned PDF has no text to check against, so its quotes can't count either way.
            scanned += 1
            continue
        counts = tally(reading)
        papers += 1
        totals.update(counts)
        if is_sample:
            samples.append({"id": paper_id, "title": title or "Untitled", **counts})
    samples.sort(key=lambda sample: sample["title"])
    return {
        "papers": papers,
        "scanned_papers": scanned,
        "quotes": totals["quotes"],
        "quotes_found": totals["quotes_found"],
        "captions": totals["captions"],
        "captions_found": totals["captions_found"],
        "samples": samples,
        "updated_at": datetime.now(UTC),
    }


def accuracy_report(session: Session) -> dict[str, Any]:
    now = time.monotonic()
    if _cache.get("expires", 0) < now:
        _cache["report"] = build_report(session)
        _cache["expires"] = now + CACHE_SECONDS
    return _cache["report"]
