import io

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.services import jobs
from app.services.arxiv import ArxivError
from app.services.figures import crop_box, figure_key, render_figure
from app.services.finishing import finish
from app.services.pdf_text import page_texts
from tests.conftest import PAPER_PDF, sample_reading, upload

SAMPLE_ID = "00000000-0000-4000-8000-000000001706"


def _ready_paper(client):
    paper_id = upload(client).json()["id"]
    return paper_id, client.get(f"/api/papers/{paper_id}").json()


def test_figures_are_checked_against_the_pdf():
    result = finish(sample_reading(), page_texts(PAPER_PDF, 60))
    (figure,) = result["figures"]
    assert figure["caption_verified"] is True
    assert figure["page"] == 2  # Claude said page 1; the caption is on page 2
    assert figure["section_id"] == "s2"
    assert (figure["top"], figure["bottom"]) == (0.3, 0.55)


def test_bad_figure_positions_and_ids_are_fixed():
    reading = sample_reading()
    figure = reading.figures[0]
    reading.figures = [
        figure.model_copy(update={"id": "../x", "top": 0.5, "bottom": 0.52}),
        figure.model_copy(update={"id": "f9", "top": 1.4, "bottom": -0.2, "caption": "Not in the paper."}),
    ]
    first, second = finish(reading, page_texts(PAPER_PDF, 60))["figures"]
    assert first["id"] == "f1"  # an id that isn't safe in a URL is replaced
    assert (first["top"], first["bottom"]) == (0.0, 1.0)  # too thin to be real: show the page
    assert (second["top"], second["bottom"]) == (0.0, 1.0)  # swapped and clamped
    assert second["caption_verified"] is False
    assert second["page"] == 1  # unchecked, so the claimed page is kept (inside the paper)


def test_the_prerequisite_map_never_goes_in_circles():
    result = finish(sample_reading(), page_texts(PAPER_PDF, 60))
    assert [(p["id"], p["builds_on"]) for p in result["prerequisites"]] == [
        ("p1", []),
        ("p2", ["p1"]),
        ("p3", ["p2"]),
    ]


def test_crop_follows_the_caption_when_the_guess_is_far_off():
    height = 1000.0
    caption = (800.0, 812.0)
    # Near the caption: the cut is stretched to include it, and ends at a figure's caption...
    assert crop_box({"top": 0.5, "bottom": 0.75, "kind": "figure"}, height, caption) == (494.0, 818.0)
    assert crop_box({"top": 0.5, "bottom": 0.9, "kind": "figure"}, height, caption) == (494.0, 818.0)
    # ...or starts at a table's.
    assert crop_box({"top": 0.7, "bottom": 0.95, "kind": "table"}, height, caption) == (794.0, 956.0)
    # Far from it: a figure is taken from above its caption, a table from below.
    assert crop_box({"top": 0.05, "bottom": 0.2, "kind": "figure"}, height, caption) == (394.0, 818.0)
    assert crop_box({"top": 0.05, "bottom": 0.2, "kind": "table"}, height, caption) == (794.0, 1000.0)
    # A drawing the cut slices through is taken in whole, but a frame round the page is not.
    spans = [(450.0, 700.0), (0.0, 1000.0)]
    assert crop_box({"top": 0.5, "bottom": 0.75, "kind": "figure"}, height, caption, spans) == (444.0, 818.0)
    # No caption found: the guess is used as it is.
    assert crop_box({"top": 0.1, "bottom": 0.3, "kind": "figure"}, height, None) == (94.0, 306.0)


def test_render_cuts_out_the_figure():
    figure = finish(sample_reading(), page_texts(PAPER_PDF, 60))["figures"][0]
    image = Image.open(io.BytesIO(render_figure(PAPER_PDF, figure)))
    assert image.width == 595 * 2  # the full page width at 144 dpi
    assert 300 < image.height < 1000  # a slice of the page, not the whole thing (1684)
    # The guess (0.3 of the page, 253 pt down) cut through the tall bar (top at 242 pt): kept whole.
    top_rows = image.crop((200, 0, 320, 40)).convert("RGB").getcolors(maxcolors=100_000)
    assert any(b > 150 and r < 120 for _, (r, g, b) in top_rows)
    # The blue bars are in the picture.
    colours = image.convert("RGB").getcolors(maxcolors=1_000_000)
    assert any(b > 150 and r < 120 for _, (r, g, b) in colours)


def test_figure_endpoint_draws_once_then_reuses(client, storage, monkeypatch):
    paper_id, paper = _ready_paper(client)
    figure = paper["reading"]["figures"][0]
    response = client.get(f"/api/papers/{paper_id}/figures/f1.png")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.headers["cache-control"] == "private, max-age=86400"
    assert response.content.startswith(b"\x89PNG")
    assert storage.read(figure_key(paper_id, figure)) == response.content

    def boom(*args):
        raise AssertionError("should come from storage")

    monkeypatch.setattr("app.api.papers.render_figure", boom)
    assert client.get(f"/api/papers/{paper_id}/figures/f1.png").content == response.content
    assert client.get(f"/api/papers/{paper_id}/figures/f7.png").status_code == 404


def test_figures_are_private_and_deleted_with_the_paper(client, storage):
    paper_id, paper = _ready_paper(client)
    key = figure_key(paper_id, paper["reading"]["figures"][0])
    assert client.get(f"/api/papers/{paper_id}/figures/f1.png").status_code == 200
    with TestClient(app) as stranger:
        assert stranger.get(f"/api/papers/{paper_id}/figures/f1.png").status_code == 404

    assert client.delete(f"/api/papers/{paper_id}").status_code == 204
    try:
        storage.read(key)
    except FileNotFoundError:
        pass
    else:
        raise AssertionError("the figure picture should be deleted")


def test_sample_figure_when_arxiv_is_unreachable(client, monkeypatch):
    def offline(*args, **kwargs):
        raise ArxivError("arXiv is unreachable")

    monkeypatch.setattr(jobs, "download_pdf", offline)
    response = client.get(f"/api/papers/{SAMPLE_ID}/figures/f1.png")
    assert response.status_code == 503
    assert response.json()["detail"] == "This figure can't be shown right now."


def test_sample_figure_on_a_page_the_pdf_lacks(client, monkeypatch):
    monkeypatch.setattr(jobs, "download_pdf", lambda *args, **kwargs: PAPER_PDF)
    response = client.get(f"/api/papers/{SAMPLE_ID}/figures/f1.png")
    # The stand-in PDF has only 2 pages and the sample's figure is on page 3.
    assert response.status_code == 503


def test_caption_is_found_when_the_pdf_lost_its_spaces():
    import pdfplumber

    from app.services.figures import _caption_box
    from tests.pdfs import make_pdf

    pdf = make_pdf([(72, 380, "Figure1:Readerswhousedtheguideunderstoodmoreofthepaper.")])
    with pdfplumber.open(io.BytesIO(pdf)) as document:
        box = _caption_box(document.pages[0], "Readers who used the guide understood more of the paper.")
    assert box is not None
    assert 450 < box[0] < 470  # 842 - 380 = 462 points from the top, less the font's height
