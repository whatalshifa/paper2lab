"""Adding a paper by its arXiv link instead of uploading the PDF.

Only arXiv ids are accepted, never arbitrary web addresses: the server builds the
download address itself, so nobody can make it fetch something else (a classic attack
called server-side request forgery).
"""

import re

import httpx

# New-style ids (2017 onwards: 1706.03762) and old-style ones (hep-th/9901001), with an optional version.
_NEW = r"\d{4}\.\d{4,5}(?:v\d+)?"
_OLD = r"[a-z][a-z\-]*(?:\.[A-Z]{2})?/\d{7}(?:v\d+)?"
_ID = re.compile(rf"^(?:{_NEW}|{_OLD})$")
_URL = re.compile(
    rf"^(?:https?://)?(?:www\.|export\.)?arxiv\.org/(?:abs|pdf)/({_NEW}|{_OLD})(?:\.pdf)?/?(?:[?#].*)?$",
    re.IGNORECASE,
)

USER_AGENT = "Paper2Lab/0.1 (+https://github.com/whatalshifa/paper2lab)"


class ArxivError(Exception):
    """A plain-words reason the paper couldn't be fetched."""


def parse_arxiv_id(text: str) -> str | None:
    """'https://arxiv.org/abs/1706.03762v7', 'arXiv:1706.03762' or '1706.03762' -> '1706.03762v7' etc."""
    text = text.strip()
    if text.lower().startswith("arxiv:"):
        text = text[6:].strip()
    if _ID.match(text):
        return text
    match = _URL.match(text)
    return match.group(1) if match else None


def download_pdf(
    arxiv_id: str, max_bytes: int, timeout: float = 30.0, transport: httpx.BaseTransport | None = None
) -> bytes:
    """transport lets tests answer instead of arXiv."""
    if not _ID.match(arxiv_id):
        raise ArxivError("That isn't an arXiv id.")
    url = f"https://arxiv.org/pdf/{arxiv_id}"
    try:
        with httpx.Client(
            timeout=timeout, follow_redirects=True, headers={"User-Agent": USER_AGENT}, transport=transport
        ) as client:
            with client.stream("GET", url) as response:
                if response.url.host not in {"arxiv.org", "www.arxiv.org", "export.arxiv.org"}:
                    raise ArxivError("arXiv sent us somewhere unexpected, so the paper wasn't fetched.")
                if response.status_code == 404:
                    raise ArxivError(f"arXiv has no paper {arxiv_id}.")
                if response.status_code != 200:
                    raise ArxivError(f"arXiv didn't send the paper (error {response.status_code}).")
                data = bytearray()
                for chunk in response.iter_bytes():
                    data += chunk
                    if len(data) > max_bytes:
                        raise ArxivError(f"That paper's PDF is over {max_bytes // 1_000_000} MB.")
    except httpx.HTTPError as exc:
        raise ArxivError("Couldn't reach arXiv. Please try again in a minute.") from exc
    if not data.startswith(b"%PDF-"):
        raise ArxivError("arXiv didn't send a PDF for that paper.")
    return bytes(data)
