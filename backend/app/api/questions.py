"""Ask the paper: questions about one paper, answered from the paper with citations."""

from datetime import UTC, datetime, timedelta
from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select

from app.api.guard import require_proxy
from app.api.papers import FactoryDep, SessionDep, SettingsDep, StorageDep, _visible_paper
from app.models import Question
from app.schemas import QuestionOut, QuestionRequest
from app.services.answerer import Answerer, get_answerer
from app.services.claude import AI_OFF
from app.services.jobs import process_question
from app.services.library import current_library, get_or_create_library
from app.services.ratelimit import RateLimiter, client_ip

router = APIRouter(prefix="/api", dependencies=[Depends(require_proxy)])

AnswererDep = Annotated[Answerer, Depends(get_answerer)]


@lru_cache
def _question_limiter() -> RateLimiter:
    from app.config import get_settings

    return RateLimiter(get_settings().questions_per_ip_per_hour, 3600)


def get_question_limiter() -> RateLimiter:
    return _question_limiter()


LimiterDep = Annotated[RateLimiter, Depends(get_question_limiter)]


@router.get("/papers/{paper_id}/questions", response_model=list[QuestionOut])
def list_questions(paper_id: str, request: Request, session: SessionDep) -> list[Question]:
    paper = _visible_paper(paper_id, request, session)
    library = current_library(request, session)
    if library is None:
        return []
    return list(
        session.scalars(
            select(Question)
            .where(Question.paper_id == paper.id, Question.library_id == library.id)
            .order_by(Question.created_at)
        )
    )


@router.post("/papers/{paper_id}/questions", response_model=QuestionOut, status_code=status.HTTP_202_ACCEPTED)
def ask(
    paper_id: str,
    body: QuestionRequest,
    request: Request,
    response: Response,
    background: BackgroundTasks,
    session: SessionDep,
    factory: FactoryDep,
    storage: StorageDep,
    answerer: AnswererDep,
    settings: SettingsDep,
    limiter: LimiterDep,
) -> Question:
    paper = _visible_paper(paper_id, request, session)
    if paper.status != "ready":
        raise HTTPException(status.HTTP_409_CONFLICT, "Questions open once the paper has been explained.")
    if not settings.ai_enabled:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, AI_OFF)

    # Spending guards, as for papers.
    since = datetime.now(UTC) - timedelta(days=1)
    total = session.scalar(select(func.count()).select_from(Question).where(Question.created_at >= since))
    if total >= settings.questions_per_day_total:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Paper2Lab has answered as many questions today as it can afford. Please try again tomorrow.",
        )
    library = current_library(request, session)
    if library is not None:
        mine = session.scalar(
            select(func.count())
            .select_from(Question)
            .where(Question.library_id == library.id, Question.created_at >= since)
        )
        if mine >= settings.questions_per_library_per_day:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                f"You can ask {settings.questions_per_library_per_day} questions a day. "
                "Please try again tomorrow.",
            )
    limiter.check(client_ip(request), "Too many questions from your network. Please wait a while.")

    library = get_or_create_library(request, response, session)
    question = Question(paper_id=paper.id, library_id=library.id, text=body.text.strip(), level=body.level)
    session.add(question)
    session.commit()
    background.add_task(process_question, question.id, factory, storage, answerer)
    return question


@router.get("/questions/{question_id}", response_model=QuestionOut)
def get_question(question_id: str, request: Request, session: SessionDep) -> Question:
    question = session.get(Question, question_id)
    library = current_library(request, session)
    if question is None or library is None or question.library_id != library.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    return question
