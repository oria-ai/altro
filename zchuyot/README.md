# zchuyot — מיצוי זכויות leveraging AI

Planning project: how to do rights exhaustion (מיצוי זכויות) in Israel with AI.

## The thesis in one paragraph

Every Israeli is entitled to a set of rights (kitzbaot, discounts, exemptions,
refunds, services) determined by their *actual life state* — but the state only
grants what you *claim*, and claiming requires knowing the right exists, parsing
bureaucratic Hebrew, and filling the right form at the right office. The gap
between **entitled** and **claimed** is the מיצוי זכויות gap, and it is largest
exactly for the people least equipped to close it (elderly, sick, poor, olim,
Arabic speakers, people in crisis).

**The AI move:** instead of making the person navigate the bureaucracy's
ontology (which is what every existing tool does — forms, questionnaires,
simulators), let the person *talk in their own words*, and have the AI do three
things:

1. **Extract their personal state** from how they naturally describe their life
   — wording, tone, what they mention in passing ("since my husband's stroke…"
   encodes caregiver status, possible attendance allowance, tax credit points,
   parking badge, and more).
2. **Build their מיצוי state**: what they already receive / have claimed.
3. **Diff #1 against government entitlement rules** (Kol Zchut, BTL, mas
   hachnasa, misrad harevacha…) and surface the gap as a concrete, prioritized
   action list — then help execute each claim.

The person is the database. The conversation is the form.

## Files

| File | What |
|------|------|
| [01-problem.md](01-problem.md) | The מיצוי זכויות gap: who, why, how big |
| [02-landscape.md](02-landscape.md) | Existing players: gov, nonprofit, commercial |
| [03-ai-leverage.md](03-ai-leverage.md) | **Core**: person-as-input — wording, tone, state-diff engine |
| [04-product-directions.md](04-product-directions.md) | Product shapes to choose between |
| [05-mvp.md](05-mvp.md) | Smallest honest first build |
| [06-data-sources.md](06-data-sources.md) | Kol Zchut, gov.il, BTL simulators, mybenefits |
| [07-risks.md](07-risks.md) | Legal-advice line, privacy, hallucination, trust |
| [08-open-questions.md](08-open-questions.md) | Decisions pending |

## Status

- 2026-06-12 — project created, first planning pass (web-grounded landscape).
