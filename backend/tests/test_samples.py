"""The sample papers are written by hand, so check they hang together like AI output would."""

import json
import re

import pytest

from app.services.reader import PaperReading
from app.services.samples import load_samples, sample_files

FILES = sample_files()
LEVELS = ("beginner", "student", "expert")


def test_there_are_samples():
    assert len(FILES) >= 2


@pytest.mark.parametrize("path", FILES, ids=lambda p: p.name)
def test_sample_is_consistent(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    reading = data["reading"]
    equation_ids = {e["id"] for e in reading["equations"]}
    section_ids = {s["id"] for s in reading["sections"]}
    assert len(equation_ids) == len(reading["equations"])
    assert len(section_ids) == len(reading["sections"])

    texts = [reading["summary"][level] for level in LEVELS]
    for section in reading["sections"]:
        assert set(section["explanation"]) == set(LEVELS)
        texts += section["explanation"].values()
        assert 1 <= len(section["quotes"]) <= 2
        for quote in section["quotes"]:
            assert 1 <= quote["page"] <= data["page_count"]
            assert isinstance(quote["verified"], bool)
    for equation in reading["equations"]:
        assert equation["section_id"] in section_ids
        assert equation["latex"] and equation["symbols"]
        texts += equation["in_words"].values()

    for text in texts:
        assert text.strip()
        for ref in re.findall(r"\[(e\d+)\]", text):
            assert ref in equation_ids, f"{ref} in {text[:40]}"
        assert text.count("$") % 2 == 0, f"unbalanced $ in {text[:40]}"

    assert 2 <= len(reading["suggested_questions"]) <= 4
    for prepared in reading["prepared_answers"]:
        assert prepared["question"] in reading["suggested_questions"]
        for part in prepared["parts"]:
            texts.append(part["text"])
            for cite in part["citations"]:
                assert 1 <= cite["start_page"] <= cite["end_page"] <= data["page_count"]
                assert len(cite["quote"].split()) >= 5
        assert "".join(p["text"] for p in prepared["parts"]).count("$") % 2 == 0

    # The AI output schema accepts the same content, so samples can't drift from real readings.
    for section in reading["sections"]:
        section.setdefault("quotes", [])
    PaperReading.model_validate({**reading, "is_research_paper": True})


def test_loading_twice_updates_in_place(session_factory):
    from sqlalchemy import func, select

    from app.models import Paper

    with session_factory() as session:
        load_samples(session)
        load_samples(session)
        assert session.scalar(select(func.count()).select_from(Paper)) == len(FILES)
