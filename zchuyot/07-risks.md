# 07 — Risks & guardrails

Ordered by how much they shape the design (not by probability).

## 1. Being wrong (hallucination → broken trust → harm)

A false "מגיע לך" sends a struggling person on a humiliating bureaucratic
journey; a missed right is the very gap we exist to close; a wrong amount is
a headline. This population gets burned once and never returns.

**Guardrails (already baked into 03/05):** deterministic rulebase with
human-reviewed predicates — the LLM never decides eligibility at runtime;
provenance on every fact and every rule; recall/precision eval gates before
any expansion; "why you match" always quotes the person's words + the official
source; calibrated language ("ייתכן שמגיע לך" vs "מגיע לך") tied to
confidence; freshness watcher (stale rule = wrong rule).

## 2. The legal-advice line (ייעוץ משפטי / טוען רביעי)

Israeli law restricts who may provide legal advice/representation (לשכת
עורכי הדין act; representation before BTL committees has its own regulated
track). *Information* about rights is legal (Kol Zchut exists); *personalized
"file this claim, argue this in your ערר"* drifts toward advice, and
**auto-drafted appeal letters are the riskiest artifact we'd produce**.

**Posture:** start as information + self-help tooling (pre-filled forms the
person reviews and submits themselves — TurboTax posture, not lawyer posture);
human-professional-in-the-loop for appeals (direction B helps here); get an
actual Israeli lawyer's opinion on exact lines BEFORE public launch. TODO:
map the regulatory perimeter precisely.

## 3. Privacy & security

PersonState = health + finances + family of vulnerable people, in one place.
Amendment 13 to the Privacy Protection Law (in force Aug 2025) raised
penalties and obligations sharply; health data may trigger extra duties.
Credential-based fetching of someone's BTL/gov.il personal area (06, rung 4)
is the riskiest pattern — defer it; never store credentials.

**Posture:** data minimization, per-source consent, encryption, deletion by
default after the engagement, DPO-grade review before scale. Privacy is also
a *selling point* against the commercial agencies.

## 4. The exploitation trap (becoming what we replace)

Charging percentage-of-award to weak populations is the predatory model the
ynet exposé describes. The mission and the % model are incompatible.

**Posture decision pending (08):** nonprofit / philanthropy-funded; or B2B
(institutions pay, person never pays); or flat-low-fee for self-serve
verticals like מענק עבודה. Hard line: **never % of a kitzba.** (Possible
exception to debate: % on one-time tax refunds for non-vulnerable salaried
users, where the comparables are 9-15% and it funds the free side.)

## 5. Ecosystem & dependency risks

- **Kol Zchut relationship**: scraping the nonprofit whose mission we share,
  without talking to them, is both wrong and fragile. Partner early.
- **State competition**: mybenefits could grow conversational. Counter: our
  moat is the person-side (wording/tone/documents/execution), where the state
  moves slowest; and direction C makes them a customer.
- **Safety duty**: distress disclosures (despair, abuse) WILL arrive in the
  intake conversations. Referral protocols (ער"ן 1201, social services, מוקד
  118) are a launch-blocking requirement, not a backlog item.
- **Tone misread**: tone analysis (03 layer 2) must only ever *soften* the
  experience (slow down, offer human), never gate or deny — a misread that
  changes outcomes is discrimination.

## 6. Effort risks (honesty section)

Rulebase maintenance is a forever-cost (every budget law, every Jan 1).
Municipal fragmentation (ארנונה) can eat months. Hebrew+Arabic voice/OCR
quality on elderly handwriting and dialects needs real eval, not vibes. And
the wedge can quietly become the whole product — guard the thesis.
