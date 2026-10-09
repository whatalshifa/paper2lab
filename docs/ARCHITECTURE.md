# How Paper2Lab works

This is a walk through the whole app, from the moment someone adds a paper to the moment they hover an
equation. Each part names the file where it lives, so you can open it and follow along.

## The three pieces

1. **The website** (`frontend/`, Next.js and React). Everything you see and click.
2. **The API** (`backend/`, Python with FastAPI). Stores papers, talks to Claude, checks the answers.
3. **Storage**: a Postgres database for papers and explanations, and a file bucket for the PDFs.

The browser only ever talks to the website. When the website needs data it calls `/api/...` on its
own address, and Next.js forwards that to the API (`frontend/next.config.ts`, `rewrites`). One address
means the browser treats the library cookie as the site's own, and there is no cross-site setup.

## 1. Adding a paper

`frontend/src/components/AddPaper.tsx` has two tabs: upload a PDF, or paste an arXiv link.

**Upload.** The file goes to `POST /api/papers` (`backend/app/api/papers.py`). Before anything else:

- The spending guards run (`_check_allowance`): is the AI switched on, has this browser, this network
  or the whole site used up today's allowance? Each paper costs one paid AI call, so this matters.
- The PDF is opened with `pdfplumber` (`backend/app/services/pdf_text.py`): is it really a PDF, does
  it have at most 60 pages, and what text is on each page? Bad files are refused here, for free.

Then the PDF is saved (`services/storage.py`: a folder on your laptop, an S3-style bucket when
deployed), a row is added to the `papers` table with status `queued`, and the API answers at once.
The real work happens in the background.

**arXiv link.** `POST /api/papers/arxiv` only accepts arXiv ids. `services/arxiv.py` pulls the id out
of whatever was pasted (`https://arxiv.org/abs/1706.03762v7`, `arXiv:1706.03762`, ...) and builds the
download address itself. It never fetches an address the visitor typed, because that would let anyone
make our server fetch anything (an attack called server-side request forgery). Downloads are capped
at 20 MB, must come from arxiv.org, and must be a PDF.

**Whose paper is it?** There are no accounts yet. The first time a browser adds a paper, the API gives
it a long random key in a cookie that page scripts can't read (`services/library.py`). The database
stores only a SHA-256 hash of that key, so a copy of the database can't be used to open anyone's
papers. Every paper belongs to one such "library", and asking for someone else's paper gets "not
found", so nobody can even learn it exists.

## 2. Claude reads the paper

`services/jobs.py` runs in the background (FastAPI's `BackgroundTasks`). It sets the status to
`reading`, fetches the PDF if it came from arXiv, and calls the reader.

`services/reader.py` sends the whole PDF to Claude in one request. Claude can read PDFs directly,
both their text and their pages as images, so it sees equations and figures the way a person does.

The interesting part is that we tell Claude exactly what shape the answer must have. `PaperReading`
is a Pydantic class (a Python class that describes data):

```
PaperReading
├── title, authors, year, field
├── summary            three versions: beginner, student, expert
├── contributions      what's new
├── prerequisites      what helps to know
├── sections[]         id, title, page, explanation (three versions), quotes[] (page + exact text)
├── equations[]        LaTeX, name, meaning (three versions), symbols[], section, page
└── concepts[]         glossary: term + one plain sentence
```

The Anthropic SDK turns that class into a JSON schema and uses **structured outputs**, so Claude's
reply is guaranteed to match it. No fragile text parsing. `services/claude.py` holds the one function
that calls Claude for the whole app: it streams the answer (long answers would otherwise time out),
turns API errors into sentences a person can read, and asks the API to retry on a fallback model if a
safety check declines.

The instructions to Claude (`SYSTEM` in `reader.py`) set the rules: follow the paper's own sections,
write the three levels with the same facts, never claim what the paper doesn't say, quote prose word
for word, and write LaTeX that KaTeX can draw. They also say the PDF is content, never instructions,
so a paper that contains "ignore your instructions" can't redirect it.

## 3. Checking the answer

The schema guarantees the shape, not the truth. `services/finishing.py` fixes what doesn't add up,
in plain Python:

- **Every quote is checked against the PDF** (`services/quotes.py`). Both the quote and each page's
  text are reduced to lowercase letters and digits, with ligatures (`ﬁ`), curly quotes and words
  split across lines undone. If the quote is found, it gets `verified: true` and the page it was really
  on. If not, it stays visible but marked, so the reader knows. Quotes shorter than five words are
  never counted as found, so a short phrase can't match by accident.
- Equation ids are made unique, an equation pointing at a section that doesn't exist moves to the
  section on its page, and `[e7]` references to equations that don't exist are removed from the text,
  so the page never shows a broken link.

The finished JSON is stored in `papers.reading` and the status becomes `ready`. If anything fails,
the status becomes `failed` with a plain sentence ("arXiv has no paper 2401.99999."), and the
reader can try again. Unexpected errors never show their technical details to the visitor.

If the server restarts in the middle, `recover_interrupted()` starts those papers again when it comes
back (`app/main.py`).

## 4. Reading the paper

`frontend/src/components/PaperPage.tsx` loads the paper. While it is `queued` or `reading`, it shows
the steps and asks again every 3 seconds. Once `ready`, `ReadingView.tsx` draws it.

- **The slider** (`LevelSlider.tsx`) is a normal range input, so it works with a mouse, a finger and
  the arrow keys. The chosen level lives in `localStorage` (`lib/level.ts`), shared by every component
  through React's `useSyncExternalStore`, so moving it re-renders every explanation at once, and other
  tabs follow along.
- **Explanations** go through `RichText.tsx`, which turns the text into paragraphs and finds three
  kinds of marks: `$...$` becomes drawn maths, `[e2]` becomes an equation chip, `**...**` becomes bold.
  Glossary terms are underlined the first time they appear in each block.
- **Maths** is drawn by KaTeX (`Tex.tsx`). The LaTeX came from an AI reading an untrusted PDF, so
  KaTeX runs with `trust: false` (no links or raw HTML) and limits on macro expansion; a formula it
  can't draw shows as red text instead of breaking the page.
- **Hover cards** (`Hovercard.tsx`) are one component for equations, equation chips and glossary
  terms. They open on mouse hover, on keyboard focus, and on tap (staying open until you tap
  elsewhere or press Escape). The card is placed by measuring the trigger, so it never runs off the
  edge of a phone screen.

## 5. Asking the paper

`AskPanel.tsx` is a side panel (a full-screen sheet on phones). A question goes to
`POST /api/papers/{id}/questions` (`backend/app/api/questions.py`), which checks the limits, saves a
`queued` question and answers it in the background; the panel asks for it every 2 seconds until it is
`ready` or `failed`.

`services/answerer.py` sends Claude the PDF with **citations turned on**. The API then splits the
answer into pieces and attaches, to each piece, the exact passages of the PDF it rests on and their
pages. Those passages are copied out of the document by the API, not typed by the model, so they
can't be invented. (Citations can't be combined with the JSON schema used for reading, which is why
answering is a separate, plain-text request.) The PDF block carries `cache_control`, and the level
and question come after it, so a second question about the same paper reuses the cached PDF.

Questions belong to the browser that asked them: someone else's question returns 404, like papers.
In demo mode the samples carry `prepared_answers` in the same shape, shown straight from the page.

## The database

Three tables (`backend/app/models.py`, created by the Alembic migrations in `backend/alembic/versions`):

- `libraries`: one row per browser, holding only the hash of its key.
- `questions`: one row per question, with its level, status and the cited answer as JSON.
- `papers`: one row per paper. Its status, error, title, authors and year are columns so lists stay
  quick; the whole explanation is one JSON column, because it is always written and read whole.

Sample papers are rows with no library and `is_sample = true`, loaded at startup from
`backend/app/samples/*.json` (`services/samples.py`).

## Tests

- `backend/tests` (pytest, 64 tests): a fake reader and answerer stand in for Claude, and small real PDFs are
  written by hand (`tests/pdfs.py`). They cover uploading, quote checking, arXiv parsing and download
  (including redirects away from arXiv), privacy between browsers, spending limits, demo mode,
  failures and retries, asking questions and their limits, and that the hand-written samples hang together.
- `frontend/e2e` (Playwright, 14 tests): the real website and API in Chromium, on a desktop and a
  phone screen. They check the slider rewrites the text, equations explain themselves, quotes link to
  the right page, a sample's prepared answer shows its source, and nothing scrolls sideways.
- CI (`.github/workflows/ci.yml`) runs all of it on every push, applies the migrations to a real
  Postgres, and checks the sample quotes against the real PDFs on arXiv.
