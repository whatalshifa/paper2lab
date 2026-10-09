import os

# Tests start their own jobs; don't let the app's restart recovery run alongside them.
os.environ.setdefault("P2L_RECOVER_JOBS_ON_START", "false")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key-not-used")  # a fake reader stands in for Claude

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.api.papers import get_ip_limiter
from app.api.questions import get_question_limiter
from app.config import Settings, get_settings
from app.db import Base, get_session_factory, make_engine
from app.main import app
from app.services.answerer import Answer, AnswerPart, Citation, get_answerer
from app.services.ratelimit import RateLimiter
from app.services.reader import (
    Concept,
    Equation,
    Figure,
    Leveled,
    PaperReading,
    Prerequisite,
    Quote,
    Section,
    Symbol,
    get_reader,
)
from app.services.storage import LocalStorage, get_storage
from tests.pdfs import make_pdf

PAGE_ONE = "We propose a new way to read research papers that anyone can follow along with."
PAGE_TWO = "Our experiments show that readers understood the main result twice as often as before."

CAPTION = "Readers who used the guide understood more of the paper."

PAPER_PDF = make_pdf(
    [(72, 760, "A Test Paper About Reading"), (72, 700, PAGE_ONE)],
    [(72, 760, PAGE_TWO), (72, 380, f"Figure 1: {CAPTION}")],
    # A bar chart above the caption on page 2.
    drawings={1: "0.3 0.3 0.8 rg 100 400 60 200 re f 200 400 60 120 re f 0 0 0 RG 90 400 m 300 400 l S"},
)


def leveled(text: str) -> Leveled:
    return Leveled(beginner=f"Simply: {text}", student=f"In short: {text}", expert=f"Formally: {text}")


def sample_reading(**overrides) -> PaperReading:
    data = dict(
        is_research_paper=True,
        title="A Test Paper About Reading",
        authors=["Asha Rao", "Ben Ode"],
        year=2026,
        field="Education",
        summary=leveled("people read papers better with help [e1]."),
        contributions=["A new reading method."],
        prerequisites=[
            Prerequisite(id="p1", topic="Reading", primer="Words.", why="A paper.", builds_on=[]),
            Prerequisite(
                id="p2",
                topic="Statistics",
                primer="Counting with care.",
                why="The results are averages.",
                builds_on=["p1", "p3", "p2"],  # p3 comes later and p2 is itself: both are dropped
            ),
            Prerequisite(id="p3", topic="Charts", primer="Pictures.", why="Figure 1.", builds_on=["p2"]),
        ],
        sections=[
            Section(
                id="s1",
                title="Introduction",
                page=1,
                explanation=leveled("the method is new [e1] and [e9]."),
                quotes=[
                    # Said page 2, really on page 1: the check should correct it.
                    Quote(page=2, text="a new way to read research papers that anyone can follow"),
                ],
            ),
            Section(
                id="s2",
                title="Results",
                page=2,
                explanation=leveled("it works."),
                quotes=[
                    Quote(page=2, text="readers understood the main result twice as often as before"),
                    Quote(page=2, text="this sentence was never written anywhere in the paper at all"),
                ],
            ),
        ],
        equations=[
            Equation(
                id="e1",
                number="(1)",
                name="Understanding",
                latex="U = \\frac{r}{t}",
                in_words=leveled("understanding is reading over time."),
                symbols=[Symbol(latex="U", meaning="understanding")],
                section_id="s9",  # doesn't exist: should be moved to the section on its page
                page=2,
            )
        ],
        figures=[
            Figure(
                id="f1",
                label="Figure 1",
                kind="figure",
                page=1,  # really on page 2: the caption check should correct it
                caption=CAPTION,
                top=0.3,
                bottom=0.55,
                explanation=leveled("readers with the guide did better."),
                how_to_read="Each bar is a group of readers; taller is better.",
                takeaway="The guide helps.",
                section_id="s2",
            )
        ],
        concepts=[Concept(term="paper", meaning="A written report of research.")],
        suggested_questions=["What is new here?", "  "],
    )
    data.update(overrides)
    return PaperReading(**data)


class FakeReader:
    def __init__(self, *results: PaperReading | Exception):
        self.results = list(results) or [sample_reading()]
        self.calls = 0

    def read(self, pdf: bytes) -> PaperReading:
        self.calls += 1
        result = self.results[min(self.calls, len(self.results)) - 1]
        if isinstance(result, Exception):
            raise result
        return result


class FakeAnswerer:
    def __init__(self, error: Exception | None = None):
        self.error = error
        self.asked: list[tuple[str, str, str]] = []

    def answer(self, pdf: bytes, title: str, question: str, level: str) -> Answer:
        if self.error:
            raise self.error
        assert pdf.startswith(b"%PDF-")
        self.asked.append((title, question, level))
        return Answer(
            parts=[
                AnswerPart(
                    text="Readers understood twice as often.",
                    citations=[Citation(quote=PAGE_TWO, start_page=2, end_page=2)],
                ),
                AnswerPart(text=" That is the main result.", citations=[]),
            ]
        )


@pytest.fixture
def answerer():
    return FakeAnswerer()


@pytest.fixture
def session_factory(tmp_path):
    engine = make_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(engine)
    yield sessionmaker(bind=engine, expire_on_commit=False)
    engine.dispose()


@pytest.fixture
def storage(tmp_path):
    return LocalStorage(tmp_path / "uploads")


@pytest.fixture
def reader():
    return FakeReader()


@pytest.fixture
def settings():
    return Settings(anthropic_api_key="test-key-not-used", recover_jobs_on_start=False)


@pytest.fixture
def client(session_factory, storage, reader, answerer, settings):
    app.dependency_overrides[get_session_factory] = lambda: session_factory
    app.dependency_overrides[get_storage] = lambda: storage
    app.dependency_overrides[get_reader] = lambda: reader
    app.dependency_overrides[get_settings] = lambda: settings
    limiter = RateLimiter(settings.papers_per_ip_per_hour, 3600)  # fresh counts for every test
    app.dependency_overrides[get_ip_limiter] = lambda: limiter
    app.dependency_overrides[get_answerer] = lambda: answerer
    question_limiter = RateLimiter(settings.questions_per_ip_per_hour, 3600)
    app.dependency_overrides[get_question_limiter] = lambda: question_limiter
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def upload(client, data=PAPER_PDF, name="paper.pdf"):
    return client.post("/api/papers", files={"file": (name, data, "application/pdf")})
