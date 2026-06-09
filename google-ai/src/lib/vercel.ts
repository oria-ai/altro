import { Vercel } from "@vercel/sdk";

// Build a Vercel SDK client bound to a single installation's access token. We store this token
// when Vercel calls our Upsert Installation endpoint, and reuse it to call back into Vercel —
// most importantly to report metered usage for billing.
export function vercelFor(accessToken: string): Vercel {
  return new Vercel({ bearerToken: accessToken });
}

export type BillingItem = {
  billingPlanId: string;
  name: string;
  price: string;
  quantity: number;
  units: string;
  total: string;
};

export type UsageItem = {
  name: string;
  type: "total" | "interval";
  units: string;
  dayValue: number;
  periodValue: number;
};

// Report usage + billing for one installation. Vercel is merchant-of-record: it invoices the
// customer on their Vercel bill from this data and pays us out. Call at least daily per install.
export async function submitBilling(
  accessToken: string,
  installationId: string,
  args: {
    timestamp: Date;
    eod: Date;
    period: { start: Date; end: Date };
    billing: BillingItem[];
    usage: UsageItem[];
  },
): Promise<void> {
  const vercel = vercelFor(accessToken);
  await vercel.marketplace.submitBillingData({
    integrationConfigurationId: installationId,
    requestBody: {
      timestamp: args.timestamp,
      eod: args.eod,
      period: args.period,
      billing: args.billing,
      usage: args.usage,
    },
  });
}
