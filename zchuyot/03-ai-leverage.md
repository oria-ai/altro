# 03 — AI leverage: the person is the input (CORE)

> Oria's framing: *leverage what the person brings — their wording, their tone;
> analyze their personal state and their מיצוי state against gov info.*

Every existing tool starts from the government's side (rules, forms,
questionnaires) and makes the person fit it. We invert: start from **what the
person brings**, in the form they naturally bring it, and let the machine do
all translation. Three analysis layers feed one diff engine.

## Layer 1 — Wording: extract the life-state from how they talk

People don't report categories; they narrate. The extraction job is to listen
to free speech/text (Hebrew, Arabic, Russian, Amharic, broken anything — be
*forgiving*, Wispr-drift-grade forgiving) and pull out the entitlement-bearing
facts, especially the ones mentioned **in passing**:

- "מאז שבעלי קיבל אירוע מוחי אני בקושי עובדת" →
  spouse: stroke (נכות? סיעוד? ניידות?), speaker: caregiver (possible
  benefit), reduced income (השלמת הכנסה? מענק עבודה?), possible tax credit
  points, possible kupat holim rights, possible parking badge for spouse.
- "חזרתי ממילואים ארוכים והעסק שלי על הפנים" → miluim grants, business
  compensation, תגמולי מילואים gaps, possibly הלום קרב screening — gently.
- Demographic & eligibility signals carried by the *language itself*: which
  language, register, literacy level → adjust output language, channel, and
  which human-help resources to offer.

Mechanism: LLM extraction into a typed **PersonState** schema (household,
health events, employment history, income band, housing, status events, army
service, dates). Every extracted fact keeps a pointer to the utterance that
produced it (provenance), with confidence; low-confidence facts become gentle
follow-up questions, never a form.

## Layer 2 — Tone: read the person's condition, not just their data

Tone is signal three ways:

1. **Crisis & capacity detection** — someone writing in panic, grief, or
   exhaustion gets a different interaction: shorter steps, more "I'll do it
   for you", earlier human-handoff offer, no 40-question intake. Someone
   matter-of-fact can move fast.
2. **Hidden-claim discovery** — shame/minimizing language ("זה לא נורא",
   "אני מסתדרת") correlates with under-claiming; the agent should proactively
   probe where the person downplays.
3. **Safety** — distress markers (despair, hints of harm, violence at home)
   trigger appropriate referrals (ער"ן, social services) — a hard requirement,
   not a feature.

Tone never blocks; it *modulates* pace, channel, and ordering.

## Layer 3 — Their מיצוי state: what they already get vs. what the gov knows

Build the second half of the diff — current standing:

- Self-reported: "אני מקבל/ת היום…" (kitzbaot, discounts, exemptions).
- Document-derived: the person photographs what they have — תלושי שכר, מכתבי
  ביטוח לאומי, אישורי ועדה רפואית, טופס 106, צו ירושה. Vision/OCR → structured
  facts. Documents are the highest-density truth source and people *have*
  them, they just can't read them. "Send me a photo of the letter" is a
  magical UX in this population.
- Eventually (consent-based): official personal data — gov.il personal area /
  BTL personal file scrapes-with-permission, הר הביטוח, מסלקה פנסיונית. This
  is the long-term moat and the heaviest legal lift (see 07).

## The diff engine: PersonState × RulesBase → Gap report

```
PersonState (layers 1-3)            RulesBase (Kol Zchut + BTL + gov.il,
  facts + provenance + confidence     compiled to eligibility predicates
                                      with sources + amounts + deadlines)
                 \                    /
                  ──── DIFF ENGINE ────
                          |
        Gap report, prioritized by (₪ value × probability ×
        urgency/deadline × effort), each item carrying:
        what / why-you-match (quoting THEIR OWN words back) /
        evidence needed / exact next action / form link
```

Design commitments:

- **Deterministic core, LLM edges.** Eligibility rules are compiled (by LLM,
  offline, reviewed) into executable predicates; at runtime the LLM only
  extracts facts and explains results. The match itself is auditable code →
  kills most hallucination risk (see 07).
- **Explain in their words.** "כתבת שאת בקושי עובדת מאז האירוע של בעלך — בגלל
  זה כנראה מגיעה לך גמלת סיעוד עבורו וייתכן השלמת הכנסה לך." Quoting the
  person's own words back is both trust and verifiability.
- **Unknown ≠ no.** Missing facts produce "this could apply, one question:"
  follow-ups, ranked by expected value of information.

## Layer 4 — Execution (where commercial value lives)

Discovery without execution is what already exists. The agent should then:
pre-fill the actual claim forms from PersonState, produce the document
checklist, draft accompanying letters and **appeals** (ערר/ערעור — LLMs are
outstanding at appeal letters, and rejection-then-no-appeal is a major leak
in the funnel), track deadlines, and follow up ("ה-60 יום לתשובה של ביטוח
לאומי עברו — נכתוב תזכורת?").

## Reusable insight

The same architecture — *narrated life-state, extracted and diffed against an
entitlement rulebase* — generalizes beyond Israel and beyond welfare
(insurance claims, consumer rights, municipal discounts). Israel + Kol Zchut
is simply the best first instance: one canonical knowledge base, one language
cluster, claim-based system, documented multi-billion gap.
