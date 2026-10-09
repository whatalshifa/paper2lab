"""What a paper connects to: the papers it builds on, and its code, models and datasets.

None of this needs the AI.
- References come from Semantic Scholar's free API: the papers this one cites, the most
  influential first, each with its one-line summary ("TLDR") and the sentence where this
  paper cites it.
- Code links are github.com addresses written in the paper's own text.
- Models and datasets that name the paper come from Hugging Face.

Every address fetched here is built from a fixed host, and links shown to readers are built
from checked ids, so nothing a paper or an API says can send anyone somewhere unexpected.

Fetched once per paper and kept. If a source was down, it is tried again an hour later.
"""

import logging
import re
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from typing import Any
from urllib.parse import quote

import httpx

from app.config import get_settings
from app.services.arxiv import USER_AGENT
from app.services.pdf_text import page_texts

log = logging.getLogger(__name__)

S2 = "https://api.semanticscholar.org/graph/v1"
HF = "https://huggingface.co/api"
MAX_REFERENCES = 12
MAX_LINKS = 5
KEEP = timedelta(days=30)
RETRY = timedelta(hours=1)

_GITHUB = re.compile(
    r"github\.com/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))/([A-Za-z0-9_.-]{1,100})", re.IGNORECASE
)
_NOT_REPOS = {"orgs", "sponsors", "features", "topics", "about", "pricing", "settings"}
_ARXIV = re.compile(r"\d{4}\.\d{4,5}|[a-z][a-z\-]*(?:\.[A-Z]{2})?/\d{7}")
_S2_ID = re.compile(r"[0-9a-f]{40}")
_HF_ID = re.compile(r"[A-Za-z0-9][\w.-]{0,95}(?:/[\w.-]{1,96})?")


def _bare(arxiv_id: str) -> str:
    """'1706.03762v7' -> '1706.03762': the version doesn't matter to other sites."""
    return re.sub(r"v\d+$", "", arxiv_id)


def _repo_name(repo: str) -> str:
    repo = repo.rstrip(".-_")
    repo = repo.removesuffix(".git")
    # Text pulled from a PDF can lose the space after a full stop: "tensor2tensor.Acknowledgements".
    head, dot, tail = repo.rpartition(".")
    if dot and tail[:1].isupper() and tail[1:2].islower():
        repo = head
    return repo


def code_links(pages: list[str]) -> list[dict[str, str]]:
    """github.com repositories the paper's text points to, in order of first mention."""
    found: dict[tuple[str, str], str] = {}
    for owner, repo in _GITHUB.findall("\n".join(pages)):
        repo = _repo_name(repo)
        if not repo or owner.lower() in _NOT_REPOS:
            continue
        found.setdefault((owner.lower(), repo.lower()), f"{owner}/{repo}")
    return [{"url": f"https://github.com/{name}", "label": name} for name in list(found.values())[:MAX_LINKS]]


def _reference(row: dict[str, Any], tldrs: dict[str, str]) -> dict[str, Any]:
    cited = row["citedPaper"]
    ids = cited.get("externalIds") or {}
    paper_id = cited.get("paperId") or ""
    arxiv = str(ids.get("ArXiv") or "")
    if _ARXIV.fullmatch(arxiv):
        url = f"https://arxiv.org/abs/{arxiv}"
    elif ids.get("DOI"):
        url = f"https://doi.org/{quote(str(ids['DOI']), safe='/')}"
    elif _S2_ID.fullmatch(paper_id):
        url = f"https://www.semanticscholar.org/paper/{paper_id}"
    else:
        url = None
    names = [author.get("name", "") for author in cited.get("authors") or [] if author.get("name")]
    contexts = [" ".join(str(c).split()) for c in row.get("contexts") or [] if str(c).strip()]
    context = contexts[0] if contexts else None
    if context and len(context) > 280:
        context = context[:279].rsplit(" ", 1)[0] + "…"
    return {
        "title": " ".join(str(cited["title"]).split()),
        "year": cited.get("year"),
        "authors": names[:3],
        "more_authors": len(names) > 3,
        "url": url,
        "tldr": tldrs.get(paper_id),
        "context": context,
        "influential": bool(row.get("isInfluential")),
        "citations": cited.get("citationCount") or 0,
    }


class Connector:
    def __init__(
        self, api_key: str = "", transport: httpx.BaseTransport | None = None, timeout: float = 15.0
    ):
        self.api_key = api_key
        self.transport = transport
        self.timeout = timeout

    def _client(self) -> httpx.Client:
        return httpx.Client(
            timeout=self.timeout,
            headers={"User-Agent": USER_AGENT},
            transport=self.transport,
            follow_redirects=False,
        )

    def references(self, client: httpx.Client, arxiv_id: str | None, title: str | None) -> dict[str, Any]:
        none = {"items": [], "total": 0}
        headers = {"x-api-key": self.api_key} if self.api_key else {}
        if arxiv_id:
            paper = f"arXiv:{_bare(arxiv_id)}"
        elif title:
            response = client.get(
                f"{S2}/paper/search/match", params={"query": title, "fields": "paperId"}, headers=headers
            )
            if response.status_code == 404:  # Semantic Scholar doesn't know this paper
                return none
            response.raise_for_status()
            matches = response.json().get("data") or []
            if not matches or not _S2_ID.fullmatch(str(matches[0].get("paperId", ""))):
                return none
            paper = matches[0]["paperId"]
        else:
            return none

        response = client.get(
            f"{S2}/paper/{quote(paper, safe=':')}/references",
            params={
                "fields": "contexts,isInfluential,title,year,authors,externalIds,citationCount",
                "limit": 500,
            },
            headers=headers,
        )
        if response.status_code == 404:
            return none
        response.raise_for_status()
        rows = [
            row for row in response.json().get("data") or [] if (row.get("citedPaper") or {}).get("title")
        ]
        rows.sort(
            key=lambda row: (not row.get("isInfluential"), -(row["citedPaper"].get("citationCount") or 0))
        )
        top = rows[:MAX_REFERENCES]

        tldrs: dict[str, str] = {}
        ids = [
            row["citedPaper"]["paperId"]
            for row in top
            if _S2_ID.fullmatch(row["citedPaper"].get("paperId") or "")
        ]
        if ids:
            # The one-line summaries come from a second call: the references list can't include them.
            batch = client.post(
                f"{S2}/paper/batch", params={"fields": "tldr"}, json={"ids": ids}, headers=headers
            )
            if batch.status_code == 200:
                for item in batch.json():
                    if item and (item.get("tldr") or {}).get("text"):
                        tldrs[item["paperId"]] = item["tldr"]["text"]
        return {"items": [_reference(row, tldrs) for row in top], "total": len(rows)}

    def hugging_face(self, client: httpx.Client, kind: str, arxiv_id: str) -> list[dict[str, Any]]:
        response = client.get(
            f"{HF}/{kind}",
            params={
                "filter": f"arxiv:{_bare(arxiv_id)}",
                "sort": "downloads",
                "direction": -1,
                "limit": MAX_LINKS,
            },
        )
        response.raise_for_status()
        prefix = "datasets/" if kind == "datasets" else ""
        return [
            {
                "id": item["id"],
                "url": f"https://huggingface.co/{prefix}{item['id']}",
                "downloads": item.get("downloads") or 0,
            }
            for item in response.json()
            if _HF_ID.fullmatch(str(item.get("id", "")))
        ]

    def gather(
        self, arxiv_id: str | None, title: str | None, pdf: Callable[[], bytes], max_pages: int
    ) -> dict[str, Any]:
        """Everything at once. A source that fails leaves its part empty and marks the result
        incomplete, so it is tried again later."""
        result: dict[str, Any] = {
            "references": None,
            "code": [],
            "models": [],
            "datasets": [],
            "complete": True,
        }
        with self._client() as client:
            try:
                result["references"] = self.references(client, arxiv_id, title)
            except Exception:
                log.warning("Semantic Scholar lookup failed", exc_info=True)
                result["complete"] = False
            if arxiv_id:
                for kind in ("models", "datasets"):
                    try:
                        result[kind] = self.hugging_face(client, kind, arxiv_id)
                    except Exception:
                        log.warning("Hugging Face %s lookup failed", kind, exc_info=True)
                        result["complete"] = False
        try:
            result["code"] = code_links(page_texts(pdf(), max_pages))
        except Exception:
            log.warning("Finding code links failed", exc_info=True)
            result["complete"] = False
        result["fetched_at"] = datetime.now(UTC).isoformat()
        return result


def is_fresh(stored: dict[str, Any] | None) -> bool:
    if not stored or "fetched_at" not in stored:
        return False
    age = datetime.now(UTC) - datetime.fromisoformat(stored["fetched_at"])
    return age < (KEEP if stored.get("complete") else RETRY)


@lru_cache
def _connector() -> Connector:
    return Connector(api_key=get_settings().semantic_scholar_api_key)


def get_connector() -> Connector:
    """FastAPI dependency, so tests can answer instead of the real services."""
    return _connector()
