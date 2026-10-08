# Decisions

Short notes on the main choices, so the reasoning isn't lost.

**One Claude call per paper, not one per section or level.** Claude sees the whole paper at once, so
a section's explanation can refer to what comes later, and the three levels state the same facts
because they are written together. It is also the cheapest option: the PDF is sent once. The cost is
a long answer (up to a few minutes), which is why reading runs in the background.

**Structured outputs instead of asking for JSON in words.** The answer is guaranteed to match the
Pydantic schema, so there is no parsing code to break.

**Quotes are checked by plain Python, not by a second AI call.** A string search can't be talked into
a wrong answer and costs nothing. The trade-off: a correct quote whose PDF text is garbled (some
scanned or oddly encoded PDFs) shows as unverified. We prefer that to a false tick.

**Three fixed reading levels, not a free-form slider.** Three levels can be written in advance in one
call and switched instantly with no waiting. A continuous slider would need a new AI call per
position.

**No accounts in Phase 1.** A random key per browser is enough to keep papers private, and it lets
anyone try the site without signing up. Accounts can adopt a browser's library later.

**Sample PDFs are linked, not included.** arXiv papers belong to their authors; the repo holds only
our explanations and short quotes, and links to the PDFs on arXiv.

**The same stack as ReportSaathi** (Next.js, FastAPI, Postgres, an S3-style bucket; Vercel, Render,
Neon), so the deployment steps are already familiar and everything runs on free plans.

**Figures are cut from the PDF on the server, and placed by the PDF's own text.** Asking Claude for
exact coordinates would be guesswork; asking only for a rough position and then finding the caption
and the drawings with pdfplumber gives a cut we can trust. Pictures are made on first view and kept,
so a paper nobody looks at costs nothing.

**The prerequisite map is steps, not a free-form graph.** Seven ideas drawn as nodes and arrows are
hard to read on a phone. Steps ("learn these, then these") show the same order and fit any screen.
