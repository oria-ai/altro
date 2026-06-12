# 06 — Data sources

Two sides of the diff: the **RulesBase** (what the state owes) and the
**PersonState** (what this person's life is + what they already get).

## RulesBase sources

| Source | What | Access | Notes |
|---|---|---|---|
| [Kol Zchut](https://www.kolzchut.org.il/) | The canonical plain-language rights wiki (He+Ar) | MediaWiki — API/dumps technically exist; [GitHub org](https://github.com/kolzchut) | **Best single substrate.** VERIFY license & reuse terms; partnering > scraping — they're a nonprofit whose mission this advances. ⚠ secondary source: always keep the chain to the primary. |
| [BTL](https://www.btl.gov.il/) — rights pages, [life events](https://www.btl.gov.il/Events/Pages/default.aspx), [simulators](https://www.btl.gov.il/Simulators/Pages/default.aspx) | Primary source for all kitzbaot: conditions, amounts (updated each Jan 1), forms | Public web; simulators encode the actual logic | Simulators are effectively reference implementations to test our predicates against. |
| [mybenefits.gov.il](https://mybenefits.gov.il/) | The state's own questionnaire→rights engine | Public | Study its coverage & question set; both a baseline to beat and a possible future partner/customer. |
| gov.il + data.gov.il | Ministry rights pages (בריאות, רווחה, שיכון, קליטה), open datasets, forms | Public / CKAN API | Municipal layer (ארנונה discounts!) is fragmented per-municipality — painful, valuable. |
| מס הכנסה / רשות המסים | Credit points, פטור, מענק עבודה rules, refund process | Public | מענק עבודה rules are simple & fully specified — ideal wedge. |
| Knesset research center (ממ"מ), BTL research dept | Take-up studies — the numbers for 01-problem.md | Public PDFs | Sourcing pass TODO. |

### RulesBase pipeline (the real asset)

`source page → LLM-drafted rule (predicate, amount, evidence, claim path,
source URL, last_verified) → human review → versioned YAML/JSON`, plus a
**freshness watcher**: rights change every January and with every budget law;
stale rules are wrong rules. Diff source pages on a schedule, flag rules whose
sources changed. This pipeline + its eval set is the defensible asset; the
chat is replaceable.

## PersonState sources (consent ladder — each step is opt-in)

1. **Their words** — the conversation itself (wording, tone). Zero friction.
2. **Their documents** — photos of תלושים, BTL letters, ועדה רפואית decisions,
   טופס 106. Vision OCR. High truth-density, they already hold them.
3. **Their self-report of current benefits** — "מה את מקבלת היום?"
4. **Official personal data (later, heavy):** gov.il personal area, BTL
   personal file (user-driven fetch with their credentials = legal minefield,
   see 07), [הר הביטוח](https://harb.cma.gov.il/) (insurance), המסלקה
   הפנסיונית. The state's own "אזרח ותיק digital file" direction may
   eventually give APIs — track it.

## Privacy posture for all of the above

PersonState is maximally sensitive (health, money, family). Defaults:
data minimization, on-device/ephemeral where possible, explicit consent per
source, Israel Privacy Protection Law (incl. the 2024 Amendment 13 regime,
in force since 2025) compliance from day one. Details in 07.
