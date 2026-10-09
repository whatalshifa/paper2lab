import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import jobs
from app.services.arxiv import download_pdf
from app.services.claude import AIError
from tests.conftest import PAPER_PDF, FakeReader, sample_reading, upload
from tests.pdfs import make_pdf

SAMPLE_ID = "00000000-0000-4000-8000-000000001706"


def test_health_and_config(client):
    assert client.get("/api/health").json() == {"status": "ok"}
    config = client.get("/api/config").json()
    assert config["ai_enabled"] is True
    assert config["max_pages"] == 60


def test_samples_are_listed_and_readable_by_anyone(client):
    lists = client.get("/api/papers").json()
    titles = {p["title"] for p in lists["samples"]}
    assert {"Attention Is All You Need", "Adam: A Method for Stochastic Optimization"} <= titles
    assert lists["mine"] == []

    paper = client.get(f"/api/papers/{SAMPLE_ID}").json()
    assert paper["status"] == "ready"
    assert paper["is_sample"] is True
    assert paper["pdf_url"] == "https://arxiv.org/pdf/1706.03762v7"
    assert paper["reading"]["equations"][0]["name"] == "Scaled dot-product attention"


def test_upload_is_read_explained_and_quotes_checked(client, reader):
    response = upload(client)
    assert response.status_code == 202
    assert "p2l_library" in response.cookies
    paper_id = response.json()["id"]

    paper = client.get(f"/api/papers/{paper_id}").json()
    assert paper["status"] == "ready"
    assert paper["title"] == "A Test Paper About Reading"
    assert paper["page_count"] == 2
    assert paper["pdf_url"] == f"/api/papers/{paper_id}/pdf"
    reading = paper["reading"]

    intro, results = reading["sections"]
    # Found, and moved to the page it is really on.
    assert intro["quotes"] == [
        {"page": 1, "text": "a new way to read research papers that anyone can follow", "verified": True}
    ]
    assert [q["verified"] for q in results["quotes"]] == [True, False]
    # A reference to an equation that doesn't exist is dropped; a real one stays.
    assert intro["explanation"]["student"] == "In short: the method is new [e1] and ."
    # An equation pointing at a missing section goes to the section on its page.
    assert reading["equations"][0]["section_id"] == "s2"
    assert reading["has_text_layer"] is True
    assert reader.calls == 1

    assert [p["id"] for p in client.get("/api/papers").json()["mine"]] == [paper_id]


def test_only_the_browser_that_added_a_paper_can_see_it(client):
    paper_id = upload(client).json()["id"]
    with TestClient(app) as stranger:
        assert stranger.get(f"/api/papers/{paper_id}").status_code == 404
        assert stranger.get(f"/api/papers/{paper_id}/pdf").status_code == 404
        assert stranger.delete(f"/api/papers/{paper_id}").status_code == 404
        assert stranger.get("/api/papers").json()["mine"] == []
        stranger.cookies.set("p2l_library", "made-up-key")
        assert stranger.get(f"/api/papers/{paper_id}").status_code == 404


def test_pdf_download_and_delete(client, storage):
    paper_id = upload(client).json()["id"]
    pdf = client.get(f"/api/papers/{paper_id}/pdf")
    assert pdf.status_code == 200
    assert pdf.headers["content-type"] == "application/pdf"
    assert pdf.content == PAPER_PDF

    assert client.delete(f"/api/papers/{paper_id}").status_code == 204
    assert client.get(f"/api/papers/{paper_id}").status_code == 404
    assert list((storage.root / "papers").iterdir()) == []


def test_sample_papers_cant_be_changed(client):
    upload(client)  # so this browser has a library
    assert client.delete(f"/api/papers/{SAMPLE_ID}").status_code == 403
    assert client.post(f"/api/papers/{SAMPLE_ID}/retry").status_code == 403


@pytest.mark.parametrize(
    ("data", "message"),
    [
        (b"hello, not a pdf", "isn't a PDF"),
        (b"%PDF-1.4 but broken", "couldn't be opened"),
        (make_pdf(*[[(72, 700, f"page {n}")] for n in range(61)]), "61 pages"),
    ],
)
def test_bad_files_are_refused_before_any_ai(client, reader, data, message):
    response = upload(client, data=data)
    assert response.status_code == 422
    assert message in response.json()["detail"]
    assert reader.calls == 0


def test_too_big_files_are_refused(client, settings):
    settings.max_upload_mb = 0
    assert upload(client).status_code == 413


def test_demo_mode_refuses_new_papers(client, settings, reader):
    settings.anthropic_api_key = None
    assert client.get("/api/config").json()["ai_enabled"] is False
    response = upload(client)
    assert response.status_code == 503
    assert "sample papers" in response.json()["detail"]
    assert client.post("/api/papers/arxiv", json={"link": "1706.03762"}).status_code == 503
    assert reader.calls == 0


def test_ai_failure_shows_a_plain_error_and_can_be_retried(client, session_factory):
    failing = FakeReader(AIError("The AI service is busy right now."), sample_reading())
    from app.services.reader import get_reader

    app.dependency_overrides[get_reader] = lambda: failing
    paper_id = upload(client).json()["id"]
    paper = client.get(f"/api/papers/{paper_id}").json()
    assert paper["status"] == "failed"
    assert paper["error"] == "The AI service is busy right now."

    assert client.post(f"/api/papers/{paper_id}/retry").status_code == 202
    assert client.get(f"/api/papers/{paper_id}").json()["status"] == "ready"
    assert client.post(f"/api/papers/{paper_id}/retry").status_code == 409


def test_unexpected_errors_dont_leak_details(client):
    from app.services.reader import get_reader

    app.dependency_overrides[get_reader] = lambda: FakeReader(RuntimeError("secret internals"))
    paper_id = upload(client).json()["id"]
    paper = client.get(f"/api/papers/{paper_id}").json()
    assert paper["status"] == "failed"
    assert paper["error"] == jobs.SOMETHING_WRONG


def test_documents_that_arent_papers_are_not_explained(client):
    from app.services.reader import get_reader

    app.dependency_overrides[get_reader] = lambda: FakeReader(sample_reading(is_research_paper=False))
    paper_id = upload(client).json()["id"]
    paper = client.get(f"/api/papers/{paper_id}").json()
    assert paper["status"] == "failed"
    assert paper["error"] == jobs.NOT_A_PAPER
    assert paper["reading"] is None


def test_daily_limit_per_browser(client, settings):
    settings.papers_per_library_per_day = 2
    assert upload(client).status_code == 202
    assert upload(client).status_code == 202
    response = upload(client)
    assert response.status_code == 429
    assert "2 papers a day" in response.json()["detail"]


def test_daily_limit_for_the_whole_site(client, settings):
    settings.papers_per_day_total = 1
    assert upload(client).status_code == 202
    with TestClient(app) as other:
        assert upload(other).status_code == 429


def fake_arxiv(monkeypatch, handler):
    def patched(arxiv_id, max_bytes, timeout=30.0, transport=None):
        return download_pdf(arxiv_id, max_bytes, timeout, transport=httpx.MockTransport(handler))

    monkeypatch.setattr(jobs, "download_pdf", patched)


def test_arxiv_link_is_fetched_and_explained(client, monkeypatch):
    asked = []

    def handler(request: httpx.Request) -> httpx.Response:
        asked.append(str(request.url))
        return httpx.Response(200, content=PAPER_PDF)

    fake_arxiv(monkeypatch, handler)
    response = client.post("/api/papers/arxiv", json={"link": "https://arxiv.org/abs/1706.03762v7"})
    assert response.status_code == 202
    paper_id = response.json()["id"]
    assert asked == ["https://arxiv.org/pdf/1706.03762v7"]

    paper = client.get(f"/api/papers/{paper_id}").json()
    assert paper["status"] == "ready"
    assert paper["arxiv_id"] == "1706.03762v7"
    assert paper["pdf_url"] == f"/api/papers/{paper_id}/pdf"

    # The same paper again just opens the first copy.
    again = client.post("/api/papers/arxiv", json={"link": "arXiv:1706.03762v7"})
    assert again.json()["id"] == paper_id
    assert len(asked) == 1


def test_arxiv_paper_that_doesnt_exist(client, monkeypatch):
    fake_arxiv(monkeypatch, lambda request: httpx.Response(404))
    paper_id = client.post("/api/papers/arxiv", json={"link": "2401.99999"}).json()["id"]
    paper = client.get(f"/api/papers/{paper_id}").json()
    assert paper["status"] == "failed"
    assert paper["error"] == "arXiv has no paper 2401.99999."


def test_non_arxiv_links_are_refused(client):
    for link in ["https://evil.example/abs/1706.03762", "http://169.254.169.254/", "not a link"]:
        response = client.post("/api/papers/arxiv", json={"link": link})
        assert response.status_code == 422, link


def test_with_a_proxy_secret_only_the_website_may_call(client, settings):
    settings.proxy_secret = "s3cret"
    assert client.get("/api/papers").status_code == 403
    assert client.get("/api/papers", headers={"x-p2l-proxy": "wrong"}).status_code == 403
    assert client.get("/api/papers", headers={"x-p2l-proxy": "s3cret"}).status_code == 200
    assert client.get(f"/api/papers/{SAMPLE_ID}/questions").status_code == 403
    # The hosting platform's health check doesn't go through the website.
    assert client.get("/api/health").status_code == 200
