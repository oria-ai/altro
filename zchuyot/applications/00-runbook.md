# Applications runbook — each one as a keyboard session

Each section = one sitting at the keyboard (host browser, your ת"ז /
הזדהות ממשלתית). Gin prepared the content; you click and paste.
Order matters only where marked.

## 0. Entity registration (חל"צ — decided v2, solo)  ⛔ blocks 1, 2, 3
**Where:** תאגידים ONLINE — רישום חברה:
https://ica.justice.gov.il/IcaSite/request-type-menu/8/1
(login with הזדהות ממשלתית). Mark the company as **חברה לתועלת הציבור**
in the registration request.
**Solo is legal:** one person may be sole shareholder + sole director.
**Bring:** company name + Hebrew alternates, Oria's ת"ז + address,
the חל"צ תקנון (draft: `halatz-takanon-draft.md` — public purposes,
no-dividend, asset-transfer-on-dissolution clauses are MANDATORY for חל"צ),
declarations (directors + shareholders) per the form, fee (~₪1,200).
**After registration:** the חל"צ must also be registered with רשם ההקדשות
(parallel track at רשות התאגידים) and appoint ועדת ביקורת.
**Time:** filing ~40 min; חל"צ requests get manual review — days to weeks.

## 1. רשות המסים — שירותים דיגיטליים + חיבור בית תוכנה
**Where:** https://signup.taxes.gov.il/SrRishum then
https://www.gov.il/he/service/connect-to-shaam
**Steps:** (a) register yourself for digital services (personal, can do
TODAY before the entity exists); (b) once entity exists: register it,
grant yourself digital authorization in the אזור האישי; (c) submit the
"חיבור בית תוכנה" request per the נוהל PDF on that page; (d) receive
developer-portal access.
**Note:** current APIs are invoices/VAT/donations — we apply to be in the
system, not because מענק עבודה is exposed yet.

## 2. Meta — business verification + WhatsApp Cloud API
**Where:** https://business.facebook.com → Settings → Business verification;
then developers.facebook.com → create app → WhatsApp.
**Bring:** entity registration certificate, matching website/domain
(use a page on meshugaim.org or a dedicated domain), business phone number
NOT currently on personal WhatsApp.
**Output:** test number works immediately; production number after
verification + display-name approval.

## 3. הרשות להגנת הפרטיות — Amendment 13 filings
**Where:** https://www.gov.il/he/departments/the_privacy_protection_authority
**What:** once the entity will hold real PersonState data: database
notification/registration per the post-תיקון-13 thresholds (sensitive data),
DPO-obligation check, security-tier classification. Do this BEFORE first
real user. Gin drafts the filing when we get there — flag when entity exists.

## 4. כל-זכות — permission / partnership  (submit WITH a demo, not before)
**Where:** email via the site's contact + board contacts.
**Bring:** working MVP-0 demo + the letter in `kolzchut-letter.md`.
**Ask:** written permission for content reuse (their license is NC) and,
ideally, a structured-content collaboration.

## 5. ביטוח לאומי — ייצוג לקוחות (via licensed professional)
**Not a form we can file ourselves.** Find the partner first: a lawyer
(gimlaot system is lawyers-only) or CPA willing to register to מערכת ייצוג
לקוחות and act as the licensed channel. Then clients sign טופס 70 / online POA.
**Gin can:** draft the partner one-pager + the POA flow UX when a candidate
exists.

## 6. (Parked) רשות ני"ע — financial-info-service license
Heavy (capital, compliance, duty-of-loyalty regime). Revisit only if/when
live financial aggregation becomes a roadmap item. Gin writes the
feasibility memo on request.

---
Status log:
- 2026-06-12 — runbook created. Nothing submitted yet.
- 2026-06-12 — entity decided: עמותה. Next human steps: pick 2nd founder + name, file at רשם העמותות; meanwhile Oria can do step 1(a) (personal tax-authority digital registration) today.
