"""Reading a paper takes a minute or two, so it runs in the background.

The API answers straight away with status "queued"; this job then fetches the PDF (for
arXiv papers), sends it to Claude, checks the result and saves it. The web page asks for
the status every few seconds until it is "ready" or "failed".

Phase 1 runs jobs inside the API process (FastAPI BackgroundTasks). If the server restarts
mid-job, recover_interrupted() picks the paper up again at startup.
"""

import logging
import threading
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings
from app.models import Paper
from app.services.arxiv import ArxivError, download_pdf
from app.services.claude import AIError
from app.services.finishing import finish
from app.services.pdf_text import BadPDF, page_texts
from app.services.reader import Reader
from app.services.storage import Storage

log = logging.getLogger(__name__)

NOT_A_PAPER = "This doesn't look like a research paper, so it wasn't explained."
SOMETHING_WRONG = "Something went wrong while reading this paper. Please try again."


def new_file_key() -> str:
    return f"papers/{uuid.uuid4()}.pdf"


def _fail(session: Session, paper: Paper, message: str) -> None:
    paper.status = "failed"
    paper.error = message
    session.commit()


def process_paper(paper_id: str, factory: sessionmaker[Session], storage: Storage, reader: Reader) -> None:
    settings = get_settings()
    with factory() as session:
        paper = session.get(Paper, paper_id)
        if paper is None or paper.status not in ("queued", "reading"):
            return
        paper.status = "reading"
        paper.error = None
        session.commit()
        try:
            if paper.file_key:
                pdf = storage.read(paper.file_key)
            elif paper.arxiv_id:
                pdf = download_pdf(paper.arxiv_id, settings.max_upload_mb * 1_000_000)
                key = new_file_key()
                storage.save(key, pdf)
                paper.file_key = key
                session.commit()
            else:
                _fail(session, paper, SOMETHING_WRONG)
                return

            pages = page_texts(pdf, settings.max_pages)
            paper.page_count = len(pages)
            reading = reader.read(pdf)
            if not reading.is_research_paper:
                _fail(session, paper, NOT_A_PAPER)
                return

            result = finish(reading, pages)
            paper.reading = result
            paper.title = result["title"] or None
            paper.authors = result["authors"]
            paper.year = result["year"]
            paper.field = (result["field"] or "")[:80] or None
            paper.status = "ready"
            session.commit()
            log.info("Paper %s is ready", paper_id)
        except (AIError, BadPDF, ArxivError) as exc:
            session.rollback()
            _fail(session, paper, str(exc))
        except Exception:
            log.exception("Reading paper %s failed", paper_id)
            session.rollback()
            _fail(session, paper, SOMETHING_WRONG)


def recover_interrupted(factory: sessionmaker[Session], storage: Storage, reader: Reader) -> None:
    """Restart papers a server restart left half-read."""
    with factory() as session:
        ids = session.scalars(
            select(Paper.id).where(Paper.status.in_(("queued", "reading")), Paper.is_sample.is_(False))
        ).all()
    for paper_id in ids:
        log.info("Resuming paper %s after a restart", paper_id)
        threading.Thread(target=process_paper, args=(paper_id, factory, storage, reader), daemon=True).start()
