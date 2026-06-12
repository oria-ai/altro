# 02 — Landscape: who already does what

Grounded by a quick web pass (2026-06-12); needs a deeper sourcing round.

## Government

- **[mybenefits.gov.il](https://mybenefits.gov.il/) — מנוע הזכויות הלאומי.**
  The state's own rights engine: questionnaire → list of likely entitlements.
  Important: this is the incumbent *and* validation that the state wants this
  solved. Its weakness is exactly our thesis — it's a **form** (you answer
  their ontology), not a conversation; it doesn't read your story, your tone,
  or your documents, and it stops at "you may be entitled" without executing.
- **[BTL מיצוי זכויות pages](https://www.btl.gov.il/AllRights/Pages/default.aspx)**
  + [rights by life events](https://www.btl.gov.il/Events/Pages/default.aspx)
  + [simulators/מחשבוני זכויות](https://www.btl.gov.il/Simulators/Pages/default.aspx)
  + [online claim forms](https://www.btl.gov.il/%D7%98%D7%A4%D7%A1%D7%99%D7%9D%20%D7%95%D7%90%D7%99%D7%A9%D7%95%D7%A8%D7%99%D7%9D/tfassim-mekuvanim/Pages/default.aspx).
  BTL also runs proactive מיצוי units and has started some automatic grants.
- **gov.il / data.gov.il** — open datasets, forms, and the government API
  gateway. Digital Israel (ישראל דיגיטלית) has מיצוי זכויות as a stated goal.

## Nonprofit / civil society

- **[כל זכות / Kol Zchut](https://www.kolzchut.org.il/)** — *the* canonical
  rights knowledge base: a MediaWiki covering essentially every right, in
  plain(er) Hebrew + Arabic, millions of users/year, nonprofit. Has a
  [GitHub org](https://github.com/kolzchut). This is the natural knowledge
  substrate for any RAG. **Open question: content license + API/dump access +
  whether to partner rather than scrape** (see 08).
- **יד מכוונת, נגישות ישראל, אגודה לזכויות האזרח, פעמונים, יד ריבה** (legal aid
  for elderly), hospital social workers, מרכזי עוצמה (municipal welfare
  rights centers) — the human מיצוי layer. They are not competitors; they are
  *distribution and trust channels* and potential B2B users (an AI copilot for
  a social worker multiplies a scarce human).

## Commercial

- **Tax-refund automators**: [Finupp](https://www.ynet.co.il/economy/article/rjvt8jilt)
  (9.5-15% commission), **tax:on** (~₪8/month flat), **Fibo**. Proven
  willingness-to-pay; narrow scope (mas hachnasa refunds for salaried workers).
- **Medical-rights agencies & lawyers** (e.g. the infotax.co.il type, לבנת פורן
  et al.): full-service נכות/ביטוח לאומי claims for 15-25%+ of the award.
  High-touch, expensive, sometimes predatory — the ynet piece above captures
  the "זול ופשוט או לא הגון" tension. They prove the value of *execution*, not
  just discovery.
- **Insurance-tech** (e.g. הר הביטוח-based apps) — adjacent: finding forgotten
  private insurance money; same "diff your state against what you hold" shape.

## The empty quadrant (our spot)

|  | Discovery | Execution |
|---|---|---|
| **Their ontology (forms)** | mybenefits, BTL simulators | BTL online forms |
| **Your story (conversation)** | **← nobody serious** | **← nobody at all** |

Everything that exists makes the *person* do the translation into bureaucratic
categories. Nothing listens to a person describe their life and runs the
diff for them, end-to-end, through claim filing and appeal. LLMs make that
quadrant buildable for the first time.
