# 05 — MVP: smallest honest first build

Goal: prove the core loop — **free-form story in → correct, prioritized,
actionable gap report out** — on real people, before building execution,
channels, or company.

## MVP-0: the diff demo (1-2 weeks of evenings)

A single Hebrew conversation (web page or even WhatsApp via existing tooling)
that:

1. Asks one open question: "ספר/י לי קצת על המצב שלך ושל המשפחה."
   Follow-ups only where the engine needs them (max ~5).
2. Extracts PersonState (typed schema, provenance per fact) with an LLM.
3. Diffs against a **hand-compiled rulebase of ~30-50 rules** covering 2-3
   clusters (suggest: מענק עבודה, caregiver/סיעוד bundle, common BTL
   kitzbaot + ארנונה discounts) — each rule: predicate, source URL (Kol
   Zchut/BTL), amount, where to claim.
4. Outputs the gap report: each item = what, why-you (quoting their words),
   estimated ₪, exact next step + link.

Explicitly NOT in MVP-0: document OCR, claim filing, accounts, tone-adaptive
flows (log tone, don't act on it yet), Arabic/Russian, any personal-data
integration.

### Build notes

- Rulebase as data, not prompt: YAML/JSON rules with `predicate`, `source`,
  `amount`, `claim_url`, `last_verified`. LLM helps *author* them from Kol
  Zchut pages offline; a human (us) reviews each. Runtime match is code.
- Eval set before polish: ~20 synthetic personas (and a few real volunteer
  stories) with hand-labeled expected entitlements → measure recall (missed
  rights = the cardinal sin), precision (false promises = the trust killer).
- Every output carries source links + "זה לא ייעוץ משפטי; בדקו מול הגורם
  הרשמי" until 07 is resolved.

## MVP-0 success test

Run 10-20 real people (friends/family first, then one social worker's
caseload with consent). Success = engine surfaces **≥1 real, claimable,
previously-unknown right for ≥30%** of them, with zero false "you're
entitled" embarrassments. That number decides whether this becomes a real
project.

## MVP-1 (only after MVP-0 passes)

Add in rough order of value-per-effort:
1. **Document photos** → OCR → facts (the magical UX; biggest extraction win).
2. **Pre-filled claim forms / letters** for the wedge cluster (execution
   starts paying).
3. Tone-modulated flow + safety referrals (required before any public launch).
4. Rulebase expansion pipeline: semi-automated Kol Zchut page → rule draft →
   human review → versioned rulebase.
5. WhatsApp voice notes (wording+tone arrives in its native medium).

## Sequencing principle

Knowledge-side (rules) scales by pipeline; person-side (extraction) scales by
model quality; **trust scales only by being right.** Hence: tiny rulebase,
verified hard, expanded only as fast as verification allows.
