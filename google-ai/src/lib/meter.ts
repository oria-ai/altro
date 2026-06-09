import { sql } from "./db";

// Record one upstream usage event. Written by the proxy after every Google call; later aggregated
// by the billing cron into a submitBillingData payload.
export async function recordUsage(args: {
  resourceId: string;
  productId: string;
  metric: string;
  quantity: number;
  units: string;
}): Promise<void> {
  await sql`
    insert into usage_events (resource_id, product_id, metric, quantity, units)
    values (${args.resourceId}, ${args.productId}, ${args.metric}, ${args.quantity}, ${args.units})
  `;
}

// Resolve an issued key to its live resource + installation (for the proxy's auth step).
export async function resolveKey(keyHash: string): Promise<
  | { resourceId: string; productId: string; installationId: string }
  | null
> {
  const rows = (await sql`
    select r.id as resource_id, r.product_id, r.installation_id
    from api_keys k
    join resources r on r.id = k.resource_id
    where k.key_hash = ${keyHash} and k.revoked_at is null and r.deleted_at is null
    limit 1
  `) as { resource_id: string; product_id: string; installation_id: string }[];
  if (rows.length === 0) return null;
  return { resourceId: rows[0].resource_id, productId: rows[0].product_id, installationId: rows[0].installation_id };
}
