"""The sample papers everyone can open, so the site works as a demo without an AI key.

Each file in app/samples/ holds one paper's reading in exactly the shape the AI pipeline
stores (see finishing.py), prepared in advance. They are loaded at startup; editing a file
and redeploying updates the sample in place.

The PDFs themselves are not included (arXiv papers belong to their authors), only links to
them on arXiv. scripts/check_sample_quotes.py downloads each PDF and marks which quotes it
found word for word.
"""

import json
import logging
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import Paper

log = logging.getLogger(__name__)

SAMPLES_DIR = Path(__file__).resolve().parent.parent / "samples"


def sample_files() -> list[Path]:
    return sorted(SAMPLES_DIR.glob("*.json"))


def load_samples(session: Session) -> None:
    for path in sample_files():
        data = json.loads(path.read_text(encoding="utf-8"))
        reading = data["reading"]
        paper = session.get(Paper, data["id"]) or Paper(id=data["id"])
        paper.is_sample = True
        paper.library_id = None
        paper.source = "sample"
        paper.arxiv_id = data.get("arxiv_id")
        paper.page_count = data.get("page_count")
        paper.status = "ready"
        paper.error = None
        paper.reading = reading
        paper.title = reading["title"]
        paper.authors = reading["authors"]
        paper.year = reading["year"]
        paper.field = reading["field"]
        session.add(paper)
    session.commit()
    log.info("Loaded %d sample papers", len(sample_files()))
