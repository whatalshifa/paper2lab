# Deploying Paper2Lab

Three pieces, each on a free plan, all in your own accounts:

| Piece | Where | What it needs |
|---|---|---|
| Website (`frontend/`) | Vercel | `API_URL` (the API's address, set before building) and `API_PROXY_SECRET` |
| API (`backend/`) | Render (Docker) | The settings below. Migrations run on every start |
| Database and PDF bucket | Neon | A Postgres database and a private bucket named `papers` |

Render's free API sleeps after 15 quiet minutes, so the first visit after a quiet spell takes about a
minute.

## Settings for the API

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Optional. Without it the site runs as a demo with the sample papers |
| `P2L_ENV` | `production` (secure cookies, API docs hidden) |
| `P2L_PROXY_SECRET` | A long random string. Render makes one for you; copy it to Vercel's `API_PROXY_SECRET` |
| `P2L_DATABASE_URL` | Neon's connection string, pasted as given |
| `P2L_STORAGE` | `s3` |
| `P2L_S3_BUCKET` | `papers` |
| `P2L_S3_ENDPOINT_URL` | The bucket's endpoint from Neon |
| `P2L_S3_REGION` | The bucket's region |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | The bucket's keys from Neon |
| `P2L_PAPERS_PER_LIBRARY_PER_DAY`, `P2L_PAPERS_PER_IP_PER_HOUR`, `P2L_PAPERS_PER_DAY_TOTAL` | Optional spending guards: 5, 10 and 40 by default |

Run one copy of the API: papers are read inside it, and a restarted API picks up papers it was in the
middle of.

## Steps

1. **Neon**: create a project, copy its connection string, then create a private bucket named
   `papers` and copy its endpoint and keys.
2. **Render**: New → Blueprint → pick this repo. It reads [`render.yaml`](../render.yaml) and asks
   for the four values it can't know.
3. **Vercel**: import the repo, set the root directory to `frontend`, add `API_URL` (the Render
   address) and `API_PROXY_SECRET` (copy `P2L_PROXY_SECRET` from Render's Environment tab), deploy.

The secret is how the API knows a request came through the website. Without the matching value on
Vercel, every page shows "Please use Paper2Lab through its website."

To switch on explaining new papers later, add `ANTHROPIC_API_KEY` in Render's Environment tab. As an estimate,
a 10 to 20 page paper costs roughly $0.30 to $0.80 to explain with Claude Opus 5.5 (the PDF going in,
three levels of explanation coming out), so $5 of credit covers somewhere around 10 to 15 papers.
