import httpx

from app.services import connections
from app.services.connections import Connector, code_links, is_fresh
from tests.conftest import upload
from tests.pdfs import make_pdf

SAMPLE_ID = "00000000-0000-4000-8000-000000001706"


def test_code_links_are_found_in_the_papers_text():
    pages = [
        "Our code is at https://github.com/tensorflow/tensor2tensor.Acknowledgements We thank",
        "See github.com/Org-Name/my.repo.git and again https://github.com/tensorflow/tensor2tensor",
        "github.com/orgs/somebody is not a repository; neither is github.com/sponsors/x",
    ]
    assert code_links(pages) == [
        {"url": "https://github.com/tensorflow/tensor2tensor", "label": "tensorflow/tensor2tensor"},
        {"url": "https://github.com/Org-Name/my.repo", "label": "Org-Name/my.repo"},
    ]


def test_references_put_influential_papers_first(connector):
    with connector._client() as client:
        result = connector.references(client, "1706.03762v7", None)
    assert result["total"] == 2  # the row without a title is skipped
    first, second = result["items"]
    assert first["title"] == "The Key Idea"
    assert first["influential"] is True
    assert first["url"] == "https://arxiv.org/abs/1207.0580"
    assert first["tldr"] == "Dropping units helps."
    assert second["url"] == "https://doi.org/10.1000/xyz"
    assert second["authors"] == ["A", "B", "C"] and second["more_authors"] is True
    assert second["context"] == "We build on earlier work [3]."


def test_semantic_scholar_is_asked_for_the_bare_arxiv_id():
    asked = []

    def handler(request: httpx.Request) -> httpx.Response:
        asked.append(request.url.path)
        return httpx.Response(404)

    connector = Connector(transport=httpx.MockTransport(handler))
    with connector._client() as client:
        assert connector.references(client, "1706.03762v7", None) == {"items": [], "total": 0}
    assert asked == ["/graph/v1/paper/arXiv:1706.03762/references"]


def test_connections_are_fetched_once_and_kept(client, monkeypatch):
    calls = []
    real = Connector.gather

    def counting(self, *args, **kwargs):
        calls.append(args[:2])
        return real(self, *args, **kwargs)

    monkeypatch.setattr(Connector, "gather", counting)
    pdf = make_pdf([(72, 700, "Code: https://github.com/someone/reader")])
    monkeypatch.setattr(
        connections, "page_texts", lambda data, max_pages: ["Code: https://github.com/someone/reader"]
    )
    paper_id = upload(client, pdf).json()["id"]

    first = client.get(f"/api/papers/{paper_id}/connections").json()
    assert first["complete"] is True
    assert first["code"] == [{"url": "https://github.com/someone/reader", "label": "someone/reader"}]
    assert [r["title"] for r in first["references"]["items"]] == ["The Key Idea", "A Popular Paper"]
    assert first["models"] == []  # an uploaded PDF has no arXiv id to look up on Hugging Face
    # Uploads are looked up by their title.
    assert calls == [(None, "A Test Paper About Reading")]

    assert client.get(f"/api/papers/{paper_id}/connections").json() == first
    assert len(calls) == 1


def test_sample_connections_include_hugging_face(client, monkeypatch):
    monkeypatch.setattr("app.api.papers.paper_pdf", lambda paper, storage: b"%PDF-")
    monkeypatch.setattr(connections, "page_texts", lambda data, max_pages: ["no links here"])
    result = client.get(f"/api/papers/{SAMPLE_ID}/connections").json()
    # The bad id ("../evil") is dropped rather than turned into a link.
    assert result["models"] == [
        {"id": "org/model", "url": "https://huggingface.co/org/model", "downloads": 12}
    ]
    assert result["datasets"] == []


def test_a_source_that_fails_is_tried_again_later(client, monkeypatch):
    def down(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429)

    from app.main import app
    from app.services.connections import get_connector

    app.dependency_overrides[get_connector] = lambda: Connector(transport=httpx.MockTransport(down))
    monkeypatch.setattr("app.api.papers.paper_pdf", lambda paper, storage: b"%PDF-")
    monkeypatch.setattr(connections, "page_texts", lambda data, max_pages: [])
    result = client.get(f"/api/papers/{SAMPLE_ID}/connections").json()
    assert result["complete"] is False
    assert result["references"] is None

    stored = {"complete": False, "fetched_at": "2000-01-01T00:00:00+00:00"}
    assert is_fresh(stored) is False
    assert is_fresh({**stored, "complete": True}) is False  # older than 30 days
    assert is_fresh(None) is False


def test_connections_can_be_switched_off(client, settings):
    settings.connections_enabled = False
    assert client.get(f"/api/papers/{SAMPLE_ID}/connections").json() == {
        "references": None,
        "code": [],
        "models": [],
        "datasets": [],
        "complete": False,
    }


def test_only_ready_papers_have_connections(client, session_factory):
    from app.models import Paper

    paper_id = upload(client).json()["id"]
    with session_factory() as session:
        session.get(Paper, paper_id).status = "reading"
        session.commit()
    assert client.get(f"/api/papers/{paper_id}/connections").status_code == 409
