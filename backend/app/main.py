import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api import papers
from app.api.papers import SessionDep
from app.config import get_settings
from app.db import get_session_factory
from app.services.jobs import recover_interrupted
from app.services.reader import get_reader
from app.services.samples import load_samples
from app.services.storage import get_storage

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    overrides = app.dependency_overrides
    factory = overrides.get(get_session_factory, get_session_factory)()
    try:
        with factory() as session:
            load_samples(session)
    except Exception:
        log.exception("Could not load the sample papers")
    if get_settings().recover_jobs_on_start:
        storage = overrides.get(get_storage, get_storage)()
        reader = overrides.get(get_reader, get_reader)()
        # In a thread, so the server starts answering straight away.
        threading.Thread(target=recover_interrupted, args=(factory, storage, reader), daemon=True).start()
    yield


app = FastAPI(title="Paper2Lab API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=True,  # the library cookie
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)

app.include_router(papers.router)


@app.get("/api/health")
def health(session: SessionDep) -> dict[str, str]:
    """For the hosting platform's health check: answers only when the database does."""
    try:
        session.execute(text("SELECT 1"))
    except Exception as exc:
        log.exception("Health check: database unreachable")
        raise HTTPException(503, "Database unreachable") from exc
    return {"status": "ok"}
