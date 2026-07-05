// Dream budget — caps the cost of the public "dream it" 360° feature.
//
// Two independent caps, both in USD, both optional (null = unlimited):
//   • monthlyCapUsd — a recurring allowance that resets each calendar month (UTC)
//   • totalCapUsd   — a lifetime ceiling that never resets
// A dream is allowed only if it stays under BOTH caps. Spend is derived from the
// number of dream rows × costPerDreamUsd (Gemini doesn't report exact per-call
// cost, so this is an editable estimate).
//
// Config is a tiny JSON object in R2 (config/dream-budget.json). "Used" is just
// the row count of the `dreams` table (all-time, and filtered to this month) —
// no extra bookkeeping. A one-time monthly "top up" is stored as a bonus tagged
// with its year-month so it only lifts the month it was granted for.

const { r2put, r2getJson } = require("./_storage.js");

const CONFIG_KEY = "config/dream-budget.json";
const DEFAULT_COST = 0.06; // USD per 360° dream — editable in admin
const DEFAULTS = { monthlyCapUsd: null, totalCapUsd: null, costPerDreamUsd: DEFAULT_COST, monthlyBonus: null };

const numOrNull = (v) => (Number(v) >= 0 && Number.isFinite(Number(v)) ? Number(v) : null);
const curYM = () => new Date().toISOString().slice(0, 7);             // "YYYY-MM"
const monthStartIso = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
};

async function loadConfig() {
  const cfg = await r2getJson(CONFIG_KEY).catch(() => null);
  return { ...DEFAULTS, ...(cfg || {}) };
}

async function saveConfig(cfg) {
  await r2put(CONFIG_KEY, Buffer.from(JSON.stringify(cfg)), "application/json");
  return cfg;
}

// The monthly allowance in effect right now = recurring base + any top-up
// granted for the current month. Returns null when the base is unlimited.
function effectiveMonthlyCap(cfg) {
  if (cfg.monthlyCapUsd == null) return null;
  const bonus = cfg.monthlyBonus && cfg.monthlyBonus.ym === curYM() ? Number(cfg.monthlyBonus.usd) || 0 : 0;
  return cfg.monthlyCapUsd + bonus;
}

// Count rows in `dreams`, optionally since an ISO timestamp. Uses a HEAD request
// with count=exact (cheap — no rows transferred). Returns null if it can't read.
async function countDreams({ sinceIso } = {}) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  let q = `${url}/rest/v1/dreams?select=id`;
  if (sinceIso) q += `&created_at=gte.${encodeURIComponent(sinceIso)}`;
  const r = await fetch(q, {
    method: "HEAD",
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0", "Range-Unit": "items" },
  }).catch(() => null);
  if (!r || !r.ok) return null;
  const cr = r.headers.get("content-range") || "";       // e.g. "0-0/123" or "*/0"
  const total = parseInt(cr.split("/")[1], 10);
  return Number.isFinite(total) ? total : null;
}

// Full picture for the admin panel + the enforcement decision.
async function computeUsage(cfg) {
  const c = cfg || (await loadConfig());
  const cost = Number(c.costPerDreamUsd) > 0 ? Number(c.costPerDreamUsd) : DEFAULT_COST;
  const [totalCount, monthCount] = await Promise.all([
    countDreams(),
    countDreams({ sinceIso: monthStartIso() }),
  ]);
  const monthCap = effectiveMonthlyCap(c);

  const totalSpent = totalCount == null ? null : +(totalCount * cost).toFixed(2);
  const monthSpent = monthCount == null ? null : +(monthCount * cost).toFixed(2);

  // Blocked if EITHER cap would be exceeded by one more dream. Unknown counts
  // (null) never block — we fail open rather than break the public feature.
  const overTotal = c.totalCapUsd != null && totalSpent != null && totalSpent + cost > c.totalCapUsd + 1e-9;
  const overMonth = monthCap != null && monthSpent != null && monthSpent + cost > monthCap + 1e-9;

  return {
    costPerDreamUsd: cost,
    month: {
      ym: curYM(), count: monthCount, spentUsd: monthSpent, capUsd: monthCap,
      baseCapUsd: c.monthlyCapUsd,
      bonusUsd: c.monthlyBonus && c.monthlyBonus.ym === curYM() ? Number(c.monthlyBonus.usd) || 0 : 0,
      remainingUsd: monthCap == null || monthSpent == null ? null : +(monthCap - monthSpent).toFixed(2),
      over: overMonth,
    },
    total: {
      count: totalCount, spentUsd: totalSpent, capUsd: c.totalCapUsd,
      remainingUsd: c.totalCapUsd == null || totalSpent == null ? null : +(c.totalCapUsd - totalSpent).toFixed(2),
      over: overTotal,
    },
    blocked: overTotal || overMonth,
  };
}

// ---- mutations (admin) ----

// Set caps / cost absolutely ("limit it"). Only provided fields change; pass
// null to clear a cap (make it unlimited).
async function setBudget({ monthlyCapUsd, totalCapUsd, costPerDreamUsd } = {}) {
  const cfg = await loadConfig();
  if (monthlyCapUsd !== undefined) cfg.monthlyCapUsd = monthlyCapUsd === null ? null : numOrNull(monthlyCapUsd);
  if (totalCapUsd !== undefined) cfg.totalCapUsd = totalCapUsd === null ? null : numOrNull(totalCapUsd);
  if (costPerDreamUsd !== undefined) {
    const c = numOrNull(costPerDreamUsd);
    if (c && c > 0) cfg.costPerDreamUsd = c;
  }
  return saveConfig(cfg);
}

// Add headroom ("top it"). scope "total" lifts the lifetime ceiling; scope
// "month" grants a one-time bonus to the CURRENT month only (doesn't inflate
// future months). A cap that was unlimited (null) stays unlimited.
async function topUp({ scope, amountUsd }) {
  const amt = numOrNull(amountUsd);
  if (!amt || amt <= 0) throw new Error("Top-up amount must be a positive number.");
  const cfg = await loadConfig();
  if (scope === "total") {
    cfg.totalCapUsd = (cfg.totalCapUsd || 0) + amt;
  } else if (scope === "month") {
    // Topping up the month only makes sense against a finite monthly allowance;
    // if the month is unlimited there's nothing to lift. Guard against silently
    // imposing a $0 cap on every future month.
    if (cfg.monthlyCapUsd == null) throw new Error("Set a monthly cap first, then you can top up the month.");
    const ym = curYM();
    if (cfg.monthlyBonus && cfg.monthlyBonus.ym === ym) cfg.monthlyBonus.usd = (Number(cfg.monthlyBonus.usd) || 0) + amt;
    else cfg.monthlyBonus = { ym, usd: amt };
  } else {
    throw new Error("Unknown top-up scope.");
  }
  return saveConfig(cfg);
}

module.exports = { loadConfig, computeUsage, setBudget, topUp };
