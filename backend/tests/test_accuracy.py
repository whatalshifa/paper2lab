from app.models import Paper
from app.services.accuracy import tally
from tests.conftest import upload


def test_tally_counts_checked_quotes_and_captions():
    reading = {
        "sections": [
            {"quotes": [{"verified": True}, {"verified": False}]},
            {"quotes": [{"verified": True}]},
        ],
        "figures": [
            {"caption": "A chart.", "caption_verified": True},
            {"caption": "", "caption_verified": False},
        ],
    }
    assert tally(reading) == {"quotes": 3, "quotes_found": 2, "captions": 1, "captions_found": 1}


def test_accuracy_report_counts_every_paper_but_names_only_samples(client, session_factory):
    before = client.get("/api/accuracy").json()
    assert before["papers"] == 2
    assert {s["title"] for s in before["samples"]} == {
        "Adam: A Method for Stochastic Optimization",
        "Attention Is All You Need",
    }

    upload(client)  # 2 of its 3 quotes are in the PDF, and its caption is
    scanned = upload(client).json()["id"]
    with session_factory() as session:
        paper = session.get(Paper, scanned)
        paper.reading = {**paper.reading, "has_text_layer": False}
        session.commit()

    from app.services import accuracy

    accuracy._cache.clear()  # the report is normally kept for a few minutes
    after = client.get("/api/accuracy").json()
    assert after["papers"] == 3
    assert after["scanned_papers"] == 1
    assert after["quotes"] == before["quotes"] + 3
    assert after["quotes_found"] == before["quotes_found"] + 2
    assert after["captions_found"] == before["captions_found"] + 1
    assert len(after["samples"]) == 2  # other people's papers are only counted, never listed
