import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { submitBilling } from "@/lib/vercel";

// Daily billing roll-up. Aggregates unreported usage per installation and reports it to Vercel,
// which then invoices the customer and pays us out. Wired to a Vercel Cron (see vercel.json).
//
// Protected by CRON_SECRET (Vercel sets the `Authorization: Bearer <CRON_SECRET>` header on cron
// invocations when that env var is present).
export const runtime = "nodejs";

// Placeholder unit prices for the MVP. Real prices live in the Integrations Console billing plans;
// these must match so the customer-facing quote equals what we report.
const PRICE = {
  gemini_tokens: { perUnit: 1_000_000, price: 0.5, units: "1M tokens" }, // $0.50 / 1M tokens
} as const;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  const installs = (await sql`
    select id, access_token from installations where deleted_at is null
  `) as { id: string; access_token: string }[];

  let reported = 0;
  for (const inst of installs) {
    const rows = (await sql`
      select metric, sum(quantity)::float8 as qty, units
      from usage_events ue
      join resources r on r.id = ue.resource_id
      where r.installation_id = ${inst.id} and ue.reported_at is null
      group by metric, units
    `) as { metric: string; qty: number; units: string }[];

    if (rows.length === 0) continue;

    const billing = rows.map((row) => {
      const p = PRICE[row.metric as keyof typeof PRICE];
      const total = p ? ((row.qty / p.perUnit) * p.price).toFixed(2) : "0.00";
      return {
        billingPlanId: `${row.metric.split("_")[0]}-payg`,
        name: row.metric,
        price: p ? p.price.toFixed(2) : "0.00",
        quantity: row.qty,
        units: row.units,
        total,
      };
    });

    const usage = rows.map((row) => ({
      name: row.metric,
      type: "total" as const,
      units: row.units,
      dayValue: row.qty,
      periodValue: row.qty,
    }));

    await submitBilling(inst.access_token, inst.id, {
      timestamp: now,
      eod: now,
      period: { start, end: now },
      billing,
      usage,
    });

    await sql`
      update usage_events set reported_at = now()
      where reported_at is null
        and resource_id in (select id from resources where installation_id = ${inst.id})
    `;
    reported++;
  }

  return NextResponse.json({ ok: true, installationsReported: reported });
}
