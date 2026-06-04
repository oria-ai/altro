// PayPal capability functions, grouped by the four scope areas.
// Each maps to a single REST endpoint; thin on purpose.
import { api } from "./client.mjs";

// ── Reads (no money moves) ───────────────────────────────────────────────

// Account balances. Needs the "Transaction Search" feature on the app.
export function balances() {
  return api("GET", "/v1/reporting/balances");
}

// Transaction history. `days` back from now (PayPal caps the window at 31 days
// per call and only the last 3 years are queryable).
export function transactions({ days = 30 } = {}) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400_000);
  const q = new URLSearchParams({
    start_date: start.toISOString().replace(/\.\d+Z$/, "-0000"),
    end_date: end.toISOString().replace(/\.\d+Z$/, "-0000"),
    fields: "transaction_info,payer_info",
    page_size: "100",
  });
  return api("GET", `/v1/reporting/transactions?${q}`);
}

export function getOrder(id) {
  return api("GET", `/v2/checkout/orders/${id}`);
}

// ── Accept payments ──────────────────────────────────────────────────────

// Create an order. intent: "CAPTURE" (charge on approval) or "AUTHORIZE".
export function createOrder({ amount, currency = "USD", intent = "CAPTURE", description } = {}) {
  if (!amount) throw new Error("createOrder needs an amount");
  return api("POST", "/v2/checkout/orders", {
    body: {
      intent,
      purchase_units: [
        {
          amount: { currency_code: currency, value: String(amount) },
          ...(description ? { description } : {}),
        },
      ],
    },
  });
}

// ── Money-moving writes (gated in the CLI) ───────────────────────────────

export function captureOrder(id) {
  return api("POST", `/v2/checkout/orders/${id}/capture`, { body: {} });
}

// Refund a captured payment. Omit amount for a full refund.
export function refund(captureId, { amount, currency = "USD", note } = {}) {
  const body = {};
  if (amount) body.amount = { value: String(amount), currency_code: currency };
  if (note) body.note_to_payer = note;
  return api("POST", `/v2/payments/captures/${captureId}/refund`, { body });
}

// Send a single payout to an email. Needs the "Payouts" feature (PayPal-approved).
export function payout({ email, amount, currency = "USD", note = "Payout", senderItemId } = {}) {
  if (!email || !amount) throw new Error("payout needs --email and --amount");
  return api("POST", "/v1/payments/payouts", {
    body: {
      sender_batch_header: {
        sender_batch_id: senderItemId || `batch_${Date.now()}`,
        email_subject: note,
      },
      items: [
        {
          recipient_type: "EMAIL",
          receiver: email,
          amount: { value: String(amount), currency },
          note,
          sender_item_id: senderItemId || `item_${Date.now()}`,
        },
      ],
    },
  });
}
