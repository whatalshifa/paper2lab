from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import Question
from app.services import jobs
from app.services.answerer import get_answerer, to_answer
from app.services.claude import AIError
from tests.conftest import PAGE_TWO, PAPER_PDF, FakeAnswerer, upload

SAMPLE_ID = "00000000-0000-4000-8000-000000001706"


def ask(client, paper_id, text="What is the main result?", level="student"):
    return client.post(f"/api/papers/{paper_id}/questions", json={"text": text, "level": level})


def test_question_about_your_paper_gets_a_cited_answer(client, answerer):
    paper_id = upload(client).json()["id"]
    response = ask(client, paper_id, level="beginner")
    assert response.status_code == 202
    question_id = response.json()["id"]

    question = client.get(f"/api/questions/{question_id}").json()
    assert question["status"] == "ready"
    assert question["answer"]["parts"][0]["citations"] == [
        {"quote": PAGE_TWO, "start_page": 2, "end_page": 2}
    ]
    assert answerer.asked == [("A Test Paper About Reading", "What is the main result?", "beginner")]

    listed = client.get(f"/api/papers/{paper_id}/questions").json()
    assert [q["id"] for q in listed] == [question_id]


def test_questions_are_private_to_the_browser(client):
    paper_id = upload(client).json()["id"]
    question_id = ask(client, paper_id).json()["id"]
    with TestClient(app) as stranger:
        assert stranger.get(f"/api/questions/{question_id}").status_code == 404
        assert stranger.get(f"/api/papers/{paper_id}/questions").status_code == 404


def test_questions_about_a_sample_fetch_its_pdf_once(client, answerer, monkeypatch, storage):
    downloads = []

    def fake_download(arxiv_id, max_bytes):
        downloads.append(arxiv_id)
        return PAPER_PDF

    monkeypatch.setattr(jobs, "download_pdf", fake_download)
    first = ask(client, SAMPLE_ID).json()["id"]
    second = ask(client, SAMPLE_ID, text="Another question?").json()["id"]
    assert client.get(f"/api/questions/{first}").json()["status"] == "ready"
    assert client.get(f"/api/questions/{second}").json()["status"] == "ready"
    assert downloads == ["1706.03762v7"]
    assert (storage.root / "arxiv" / "1706.03762v7.pdf").exists()

    # Someone else's questions about the same sample stay theirs.
    with TestClient(app) as stranger:
        assert stranger.get(f"/api/papers/{SAMPLE_ID}/questions").json() == []


@pytest.mark.parametrize(
    ("body", "code"),
    [
        ({"text": "?", "level": "student"}, 422),
        ({"text": "x" * 501, "level": "student"}, 422),
        ({"text": "Fine question", "level": "genius"}, 422),
    ],
)
def test_bad_questions_are_refused(client, body, code):
    paper_id = upload(client).json()["id"]
    assert client.post(f"/api/papers/{paper_id}/questions", json=body).status_code == code


def test_no_questions_before_the_paper_is_ready(client, session_factory):
    from app.models import Paper

    paper_id = upload(client).json()["id"]
    with session_factory() as session:
        session.get(Paper, paper_id).status = "reading"
        session.commit()
    assert ask(client, paper_id).status_code == 409


def test_demo_mode_refuses_questions(client, settings, answerer):
    settings.anthropic_api_key = None
    response = ask(client, SAMPLE_ID)
    assert response.status_code == 503
    assert answerer.asked == []


def test_failed_answers_say_why(client):
    app.dependency_overrides[get_answerer] = lambda: FakeAnswerer(
        AIError("The AI service is busy right now.")
    )
    paper_id = upload(client).json()["id"]
    question = client.get(f"/api/questions/{ask(client, paper_id).json()['id']}").json()
    assert question["status"] == "failed"
    assert question["error"] == "The AI service is busy right now."


def test_daily_question_limit(client, settings):
    settings.questions_per_library_per_day = 1
    paper_id = upload(client).json()["id"]
    assert ask(client, paper_id).status_code == 202
    response = ask(client, paper_id)
    assert response.status_code == 429
    assert "1 questions a day" in response.json()["detail"]


def test_deleting_a_paper_deletes_its_questions(client, session_factory):
    paper_id = upload(client).json()["id"]
    ask(client, paper_id)
    assert client.delete(f"/api/papers/{paper_id}").status_code == 204
    with session_factory() as session:
        assert session.query(Question).count() == 0


def test_interrupted_questions_are_marked_failed_on_restart(client, session_factory, storage, reader):
    paper_id = upload(client).json()["id"]
    question_id = ask(client, paper_id).json()["id"]
    with session_factory() as session:
        session.get(Question, question_id).status = "answering"
        session.commit()
    jobs.recover_interrupted(session_factory, storage, reader)
    question = client.get(f"/api/questions/{question_id}").json()
    assert question["status"] == "failed"
    assert "ask again" in question["error"]


def citation(text, start, end):
    return SimpleNamespace(
        type="page_location", cited_text=text, start_page_number=start, end_page_number=end
    )


def test_api_reply_becomes_an_answer():
    message = SimpleNamespace(
        content=[
            SimpleNamespace(type="thinking", thinking=""),
            SimpleNamespace(type="text", text="It works ", citations=[citation(" the quote ", 3, 4)]),
            SimpleNamespace(type="text", text="because of this.", citations=None),
        ]
    )
    answer = to_answer(message)
    assert answer.parts[0].citations[0].model_dump() == {"quote": "the quote", "start_page": 3, "end_page": 3}
    assert answer.parts[1].citations == []


def test_empty_reply_is_an_error():
    with pytest.raises(AIError):
        to_answer(SimpleNamespace(content=[SimpleNamespace(type="text", text="", citations=None)]))
