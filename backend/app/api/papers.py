"""The paper endpoints: add a paper (PDF or arXiv link), list them, read one, delete one."""

from datetime import UTC, datetime, timedelta
from functools import lru_cache
from typing import Annotated

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings, get_settings
from app.db import get_session, get_session_factory
from app.models import Paper
from app.schemas import ArxivRequest, PaperDetail, PaperLists, PaperSummary, SiteConfig
from app.services.arxiv import ArxivError, parse_arxiv_id
from app.services.claude import AI_OFF, AIError
from app.services.figures import FigureError, figure_key, render_figure
from app.services.jobs import new_file_key, paper_pdf, process_paper
from app.services.library import current_library, get_or_create_library
from app.services.pdf_text import BadPDF, page_texts
from app.services.ratelimit import RateLimiter, client_ip
from app.services.reader import Reader, get_reader
from app.services.storage import Storage, get_storage

router = APIRouter(prefix="/api")

SessionDep = Annotated[Session, Depends(get_session)]
FactoryDep = Annotated[sessionmaker[Session], Depends(get_session_factory)]
StorageDep = Annotated[Storage, Depends(get_storage)]
ReaderDep = Annotated[Reader, Depends(get_reader)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


@lru_cache
def _ip_limiter() -> RateLimiter:
    return RateLimiter(get_settings().papers_per_ip_per_hour, 3600)


def get_ip_limiter() -> RateLimiter:
    return _ip_limiter()


IpLimiterDep = Annotated[RateLimiter, Depends(get_ip_limiter)]


@router.get("/config", response_model=SiteConfig)
def site_config(settings: SettingsDep) -> SiteConfig:
    return SiteConfig(
        ai_enabled=settings.ai_enabled, max_upload_mb=settings.max_upload_mb, max_pages=settings.max_pages
    )


@router.get("/papers", response_model=PaperLists)
def list_papers(request: Request, session: SessionDep) -> PaperLists:
    samples = session.scalars(
        select(Paper).where(Paper.is_sample.is_(True)).order_by(Paper.year.desc())
    ).all()
    library = current_library(request, session)
    mine = []
    if library is not None:
        mine = session.scalars(
            select(Paper).where(Paper.library_id == library.id).order_by(Paper.created_at.desc())
        ).all()
    return PaperLists(
        samples=[PaperSummary.model_validate(p) for p in samples],
        mine=[PaperSummary.model_validate(p) for p in mine],
    )


def _visible_paper(paper_id: str, request: Request, session: Session) -> Paper:
    """The paper, if this browser may see it. Anyone else's paper is reported as not found,
    so nobody can even learn that it exists."""
    paper = session.get(Paper, paper_id)
    if paper is not None and paper.is_sample:
        return paper
    library = current_library(request, session)
    if paper is None or library is None or paper.library_id != library.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Paper not found")
    return paper


def _own_paper(paper_id: str, request: Request, session: Session) -> Paper:
    paper = _visible_paper(paper_id, request, session)
    if paper.is_sample:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Sample papers can't be changed.")
    return paper


def _detail(paper: Paper) -> PaperDetail:
    if paper.file_key:
        pdf_url = f"/api/papers/{paper.id}/pdf"
    elif paper.arxiv_id:
        pdf_url = f"https://arxiv.org/pdf/{paper.arxiv_id}"
    else:
        pdf_url = None
    return PaperDetail(
        **PaperSummary.model_validate(paper).model_dump(), reading=paper.reading, pdf_url=pdf_url
    )


@router.get("/papers/{paper_id}", response_model=PaperDetail)
def get_paper(paper_id: str, request: Request, session: SessionDep) -> PaperDetail:
    return _detail(_visible_paper(paper_id, request, session))


@router.get("/papers/{paper_id}/pdf")
def get_pdf(paper_id: str, request: Request, session: SessionDep, storage: StorageDep) -> Response:
    paper = _visible_paper(paper_id, request, session)
    if not paper.file_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This paper has no stored PDF")
    return Response(
        storage.read(paper.file_key),
        media_type="application/pdf",
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/papers/{paper_id}/figures/{figure_id}.png")
def get_figure(
    paper_id: str, figure_id: str, request: Request, session: SessionDep, storage: StorageDep
) -> Response:
    """A figure cut out of its page. Drawn the first time it is asked for, then kept."""
    paper = _visible_paper(paper_id, request, session)
    figures = (paper.reading or {}).get("figures", [])
    figure = next((f for f in figures if f.get("id") == figure_id), None)
    if figure is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Figure not found")
    key = figure_key(paper.id, figure)
    try:
        image = storage.read(key)
    except Exception:  # not drawn yet (a missing file looks different locally and on S3)
        try:
            image = render_figure(paper_pdf(paper, storage), figure)
        except (ArxivError, AIError, FigureError) as exc:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE, "This figure can't be shown right now."
            ) from exc
        storage.save(key, image)
    return Response(
        image,
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=86400" if paper.is_sample else "private, max-age=86400",
            "X-Content-Type-Options": "nosniff",
        },
    )


def _check_allowance(request: Request, session: Session, settings: Settings, limiter: RateLimiter) -> None:
    """Spending guards: every new paper is one paid AI call."""
    if not settings.ai_enabled:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, AI_OFF)
    since = datetime.now(UTC) - timedelta(days=1)
    total = session.scalar(
        select(func.count()).select_from(Paper).where(Paper.is_sample.is_(False), Paper.created_at >= since)
    )
    if total >= settings.papers_per_day_total:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Paper2Lab has explained as many papers today as it can afford. Please try again tomorrow.",
        )
    library = current_library(request, session)
    if library is not None:
        mine = session.scalar(
            select(func.count())
            .select_from(Paper)
            .where(Paper.library_id == library.id, Paper.created_at >= since)
        )
        if mine >= settings.papers_per_library_per_day:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                f"You can add {settings.papers_per_library_per_day} papers a day. Please try again tomorrow.",
            )
    limiter.check(client_ip(request), "Too many papers from your network. Please wait an hour.")


def _start(paper: Paper, background: BackgroundTasks, factory, storage, reader) -> None:
    background.add_task(process_paper, paper.id, factory, storage, reader)


@router.post("/papers", response_model=PaperSummary, status_code=status.HTTP_202_ACCEPTED)
async def upload_paper(
    request: Request,
    response: Response,
    background: BackgroundTasks,
    session: SessionDep,
    factory: FactoryDep,
    storage: StorageDep,
    reader: ReaderDep,
    settings: SettingsDep,
    limiter: IpLimiterDep,
    file: Annotated[UploadFile, File()],
) -> PaperSummary:
    _check_allowance(request, session, settings, limiter)
    limit = settings.max_upload_mb * 1_000_000
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, f"Papers up to {settings.max_upload_mb} MB.")
    try:
        pages = page_texts(data, settings.max_pages)
    except BadPDF as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc

    library = get_or_create_library(request, response, session)
    key = new_file_key()
    storage.save(key, data)
    filename = (file.filename or "paper.pdf").rsplit("/", 1)[-1][:255]
    paper = Paper(
        library_id=library.id,
        source="upload",
        filename=filename,
        file_key=key,
        page_count=len(pages),
        title=filename.removesuffix(".pdf"),
    )
    session.add(paper)
    session.commit()
    _start(paper, background, factory, storage, reader)
    return PaperSummary.model_validate(paper)


@router.post("/papers/arxiv", response_model=PaperSummary, status_code=status.HTTP_202_ACCEPTED)
def add_arxiv_paper(
    body: ArxivRequest,
    request: Request,
    response: Response,
    background: BackgroundTasks,
    session: SessionDep,
    factory: FactoryDep,
    storage: StorageDep,
    reader: ReaderDep,
    settings: SettingsDep,
    limiter: IpLimiterDep,
) -> PaperSummary:
    arxiv_id = parse_arxiv_id(body.link)
    if arxiv_id is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "That isn't an arXiv link. It should look like https://arxiv.org/abs/1706.03762",
        )
    # The same paper twice from one browser just opens the first copy (unless that one failed).
    library = current_library(request, session)
    if library is not None:
        existing = session.scalar(
            select(Paper).where(
                Paper.library_id == library.id, Paper.arxiv_id == arxiv_id, Paper.status != "failed"
            )
        )
        if existing is not None:
            return PaperSummary.model_validate(existing)

    _check_allowance(request, session, settings, limiter)
    library = get_or_create_library(request, response, session)
    paper = Paper(library_id=library.id, source="arxiv", arxiv_id=arxiv_id, title=f"arXiv:{arxiv_id}")
    session.add(paper)
    session.commit()
    _start(paper, background, factory, storage, reader)
    return PaperSummary.model_validate(paper)


@router.post("/papers/{paper_id}/retry", response_model=PaperSummary, status_code=status.HTTP_202_ACCEPTED)
def retry_paper(
    paper_id: str,
    request: Request,
    background: BackgroundTasks,
    session: SessionDep,
    factory: FactoryDep,
    storage: StorageDep,
    reader: ReaderDep,
    settings: SettingsDep,
    limiter: IpLimiterDep,
) -> PaperSummary:
    paper = _own_paper(paper_id, request, session)
    if paper.status != "failed":
        raise HTTPException(status.HTTP_409_CONFLICT, "Only a paper that failed can be tried again.")
    if not settings.ai_enabled:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, AI_OFF)
    limiter.check(client_ip(request), "Too many papers from your network. Please wait an hour.")
    paper.status = "queued"
    paper.error = None
    session.commit()
    _start(paper, background, factory, storage, reader)
    return PaperSummary.model_validate(paper)


@router.delete("/papers/{paper_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_paper(paper_id: str, request: Request, session: SessionDep, storage: StorageDep) -> None:
    paper = _own_paper(paper_id, request, session)
    if paper.file_key:
        storage.delete(paper.file_key)
    for figure in (paper.reading or {}).get("figures", []):
        storage.delete(figure_key(paper.id, figure))
    session.delete(paper)
    session.commit()
