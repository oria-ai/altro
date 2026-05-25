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
