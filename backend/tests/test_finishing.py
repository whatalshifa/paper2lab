from app.services.finishing import finish
from app.services.reader import Quote, Section
from tests.conftest import leveled, sample_reading


def test_duplicate_ids_are_renumbered():
    section = Section(id="s1", title="Again", page=1, explanation=leveled("x"), quotes=[])
    reading = sample_reading()
    reading.sections.append(section)
    result = finish(reading, ["text"] * 3)
    assert [s["id"] for s in result["sections"]] == ["s1", "s2", "s3"]


def test_pages_are_kept_inside_the_paper():
    reading = sample_reading()
    reading.sections[0].page = 40
    reading.sections[0].quotes = [Quote(page=0, text="not in the paper but long enough to check")]
    result = finish(reading, ["one", "two"])
    assert result["sections"][0]["page"] == 2
    assert result["sections"][0]["quotes"][0]["page"] == 1


def test_scanned_papers_have_no_verified_quotes():
    result = finish(sample_reading(), ["", ""])
    assert result["has_text_layer"] is False
    assert all(not q["verified"] for s in result["sections"] for q in s["quotes"])
