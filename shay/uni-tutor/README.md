# uni-tutor

An AI tutor that logs into your university site **once**, roams it to learn your
course material in an organized way, and then **solves the tasks** and **tutors
you** on the subject — all from a machine you control.

Pipeline:

```
auth ──▶ crawl ──▶ learn ──▶ solve   (worked solutions, for teaching)
  (session)  (pages)  (notes+tasks) └▶ tutor   (interactive, grounded chat)
```

Everything Claude reads and produces is stored under `data/` so it persists.

## Why it can't run in the cloud session

The login needs a real browser window (for passwords / 2FA / SSO), and the
saved session must persist on a machine you control. Run it **locally**.

## Setup

```sh
cd uni-tutor
npm install
npx playwright install chromium
```

## 0. Probe the mechanism first (no credentials needed)

Before trusting it with a real login, verify the core round-trip:

```sh
npm run probe
```

It logs into a public auth-demo site, saves `storageState`, **closes the
browser entirely**, opens a **fresh** browser from the saved state, and
confirms it's still logged in. `PASS` means the save/restore engine works.

**What this proves:** Playwright can persist and restore a cookie/localStorage
session across separate browser instances.
**What it can't prove:** that *OpenU specifically* keeps its auth where we can
save it. `storageState` captures cookies + localStorage but **not**
`sessionStorage`. If OpenU stores its SSO token in `sessionStorage`, the probe
still passes but step 2 below would bounce you to login — that's the real test
for OpenU, and step 2 surfaces it immediately.

## 1. Log in once and save the session

```sh
# Defaults to the Open University of Israel SSO (Sheilta portal).
# Override for any institution:
LOGIN_URL=https://login.your-uni.example npm run auth
```

A browser opens. Log in normally. When you can see your courses, return to the
terminal and press Enter. The session is written to `.session/state.json`.

> `.session/` holds **live login cookies** and is gitignored. Never commit it.

## 2. Reuse the session to fetch a page

```sh
npm run fetch -- "https://sheilta.apps.openu.ac.il/pls/dmyopt2/<a-course-page>"
```

If it prints your course content instead of a login page, the saved session
works and the rest of the pipeline will too.

## 3. Roam the site and learn it

You need a Claude API key for everything below:

```sh
export ANTHROPIC_API_KEY=sk-ant-...
```

**Crawl** — reuse the session to roam the portal (read-only: it only follows
links, never submits forms, and skips logout/delete/submit URLs) and save pages
to `data/pages/`:

```sh
npm run crawl                 # starts at the Sheilta main page
npm run crawl -- "<a-course-home-url>"   # or start somewhere specific
```

Tunable via env: `MAX_PAGES` (40), `MAX_DEPTH` (2), `REQUEST_DELAY_MS` (800).

**Learn** — turn the scraped pages into organized Markdown notes
(`data/notes/`) and extract a list of assignments/tasks (`data/tasks.json`):

```sh
npm run learn
```

## 4. Solve tasks and get tutored

**Solve** — produce a worked, explained solution for a task (grounded in your
notes), saved to `data/solutions/`:

```sh
npm run solve -- list      # see the extracted tasks
npm run solve -- 1         # solve task #1   (or `all`)
```

**Tutor** — an interactive chat grounded in your course notes:

```sh
npm run tutor              # ask anything; /quiz for a question; /exit to quit
```

## Model & cost

Defaults to `claude-opus-4-7` with adaptive thinking; override with
`MODEL=claude-sonnet-4-6` for lower cost. Course material is sent in a cached
system block, so repeated `tutor`/`solve` calls reuse it cheaply.

## Notes on terms of use & integrity

Use this only with **your own account** and **your own course materials**, and
within your institution's acceptable-use terms. `solve` produces worked
solutions to help you *learn the method* — don't submit generated work as your
own where that breaks your course's academic-integrity rules.
