import httpx
import pytest

from app.services.arxiv import ArxivError, download_pdf, parse_arxiv_id


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("1706.03762", "1706.03762"),
        ("  1706.03762v7 ", "1706.03762v7"),
        ("arXiv:1412.6980", "1412.6980"),
        ("https://arxiv.org/abs/1706.03762", "1706.03762"),
        ("https://arxiv.org/pdf/1706.03762v7", "1706.03762v7"),
        ("https://arxiv.org/pdf/1706.03762v7.pdf", "1706.03762v7"),
        ("arxiv.org/abs/2401.12345?context=cs", "2401.12345"),
        ("https://www.arxiv.org/abs/hep-th/9901001", "hep-th/9901001"),
        ("math.GT/0309136", "math.GT/0309136"),
    ],
)
def test_parses_arxiv_ids(text, expected):
    assert parse_arxiv_id(text) == expected


@pytest.mark.parametrize(
    "text",
    [
        "https://arxiv.org.evil.example/abs/1706.03762",
        "https://evil.example/arxiv.org/abs/1706.03762",
        "https://arxiv.org/abs/../../etc/passwd",
        "17060.3762",
        "",
        "file:///etc/passwd",
    ],
)
def test_refuses_anything_else(text):
    assert parse_arxiv_id(text) is None


def respond(response: httpx.Response):
    return httpx.MockTransport(lambda request: response)


def test_download():
    assert download_pdf("1706.03762", 1000, transport=respond(httpx.Response(200, content=b"%PDF-1.5 x")))


def test_download_refuses_non_pdfs_and_big_files():
    with pytest.raises(ArxivError, match="didn't send a PDF"):
        download_pdf("1706.03762", 1000, transport=respond(httpx.Response(200, content=b"<html>")))
    with pytest.raises(ArxivError, match="over"):
        download_pdf("1706.03762", 5, transport=respond(httpx.Response(200, content=b"%PDF-1.5 xxxxxx")))
    with pytest.raises(ArxivError, match="error 503"):
        download_pdf("1706.03762", 1000, transport=respond(httpx.Response(503)))
    with pytest.raises(ArxivError, match="isn't an arXiv id"):
        download_pdf("../secret", 1000)


def test_download_refuses_redirects_away_from_arxiv():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "arxiv.org":
            return httpx.Response(302, headers={"Location": "https://evil.example/x.pdf"})
        return httpx.Response(200, content=b"%PDF-1.5 evil")

    with pytest.raises(ArxivError, match="somewhere unexpected"):
        download_pdf("1706.03762", 1000, transport=httpx.MockTransport(handler))
