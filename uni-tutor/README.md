# uni-tutor

Logs into a university site **once**, saves the session, and reuses it to pull
course material. This is the foundation for an AI tutor that learns from your
own materials and teaches them back.

This first slice proves the core: **auth + save session**.

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
works — and the next slices (scrape → learn → teach) build on top of this.

## Note on terms of use

Use this only with your own account and your own course materials, and within
your institution's acceptable-use terms.
