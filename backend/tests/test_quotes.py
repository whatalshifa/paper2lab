from app.services.quotes import find_page, normalise


def test_normalise_handles_pdf_quirks():
    assert normalise("The ﬁrst “quoted” word-\nbreak,  here.") == "the first quoted wordbreak here"


PAGES = [
    "Page one talks about something else entirely and nothing more.",
    "We trained on the standard WMT 2014 English-German dataset consisting of about 4.5 million pairs.",
    "The end of this sentence carries on over the page",
    "break to the next page of the paper, as they often do.",
]


def test_finds_quote_on_the_claimed_page():
    assert find_page("standard WMT 2014 English-German dataset consisting of", PAGES, 2) == 2


def test_corrects_a_wrong_page():
    assert find_page("standard WMT 2014 English-German dataset consisting of", PAGES, 4) == 2


def test_tolerates_spacing_case_and_punctuation():
    assert find_page("We trained on the standard WMT-2014 english german   dataset", PAGES, 2) == 2


def test_quote_over_a_page_break():
    assert find_page("carries on over the page break to the next page", PAGES, 3) == 3


def test_missing_or_too_short_quotes():
    assert find_page("a sentence that is not in the paper at all", PAGES, 1) is None
    assert find_page("the paper", PAGES, 4) is None
    assert find_page("anything at all goes here", [], 1) is None


def test_tolerates_missing_and_extra_spaces_from_latex_pdfs():
    # How pdfplumber reads many arXiv papers: spaces lost between words, or added inside them.
    pages = ["Mostcompetitiveneuralsequencetransductionmodelshave an encoder-decoder structure [5,2,35]."]
    assert (
        find_page(
            "Most competitive neural sequence transduction models have an encoder-decoder structure.",
            pages,
            1,
        )
        == 1
    )
    pages = ["The name A dam is de rived from adap tive moment estimation."]
    assert find_page("The name Adam is derived from adaptive moment estimation.", pages, 1) == 1


def test_short_captions_are_found_with_their_label():
    from app.services.quotes import find_caption

    pages = ["text", "Figure1:TheTransformer-modelarchitecture."]
    assert find_caption("Figure 1", "The Transformer - model architecture.", pages, 2) == 2
    assert find_caption("Figure 9", "The Transformer - model architecture.", pages, 2) is None
