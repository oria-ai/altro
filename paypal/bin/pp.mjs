#!/usr/bin/env node
// PayPal agent CLI.
// Always run with secrets injected by Doppler:
//   doppler run --project oria --config prd -- node bin/pp.mjs <command> [opts]
//
// Money-moving commands (capture, refund, payout) refuse to run without an
// explicit confirmation: either --yes on the command line, or an interactive
// "yes" at the prompt. Reads (whoami, balance, transactions, order) just run.
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { token, scopes, baseUrl } from "../src/client.mjs";
import * as pp from "../src/paypal.mjs";

// --- tiny arg parser: flags as --key value or --key=value, plus positionals ---
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq !== -1) out[a.slice(2, eq)] = a.slice(eq + 1);
      else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) out[a.slice(2)] = argv[++i];
      else out[a.slice(2)] = true;
    } else out._.push(a);
  }
  return out;
}

const print = (o) => console.log(JSON.stringify(o, null, 2));

async function confirm(summary, args) {
  console.error(`\n⚠️  MONEY-MOVING ACTION on LIVE PayPal:\n   ${summary}\n`);
  if (args.yes) {
    console.error("   (--yes given, proceeding)\n");
    return true;
  }
  const rl = createInterface({ input: stdin, output: stdout });
  const ans = (await rl.question("   Type 'yes' to proceed: ")).trim().toLowerCase();
  rl.close();
  return ans === "yes";
}

const HELP = `pp — PayPal agent (LIVE: ${baseUrl?.() ?? ""})

Reads:
  whoami                      Show app id + granted scopes
  balance                     Account balances        (needs Transaction Search)
  transactions [--days 30]    Transaction history     (needs Transaction Search)
  order <order-id>            Fetch one order

Accept payments:
  create --amount 10.00 [--currency USD] [--intent CAPTURE] [--description "..."]
  capture <order-id>                         ⚠️ charges the buyer

Refunds:
  refund <capture-id> [--amount 5.00] [--currency USD] [--note "..."]   ⚠️

Payouts:
  payout --email x@y.com --amount 10.00 [--currency USD] [--note "..."]  ⚠️ (needs Payouts)

Add --yes to skip the confirm prompt on money-moving actions.
`;

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  try {
    switch (cmd) {
      case undefined:
      case "help":
      case "-h":
      case "--help":
        console.log(HELP);
        return;

      case "whoami": {
        const sc = await scopes();
        const has = (frag) => sc.some((s) => s.includes(frag));
        print({
          env: process.env.PAYPAL_ENV || "live",
          authenticated: !!(await token()),
          capabilities: {
            payments_orders: has("payments/.*") || has("/payments/"),
            transaction_search: has("reporting/search/read"),
            payouts: has("payments/payouts"),
            subscriptions: has("subscriptions"),
            webhooks: has("webhooks"),
          },
          scopes: sc,
        });
        return;
      }

      case "balance":
        print(await pp.balances());
        return;

      case "transactions":
        print(await pp.transactions({ days: Number(args.days) || 30 }));
        return;

      case "order": {
        const id = args._[0];
        if (!id) throw new Error("usage: order <order-id>");
        print(await pp.getOrder(id));
        return;
      }

      case "create": {
        const o = await pp.createOrder({
          amount: args.amount,
          currency: args.currency,
          intent: args.intent,
          description: args.description,
        });
        print(o);
        return;
      }

      case "capture": {
        const id = args._[0];
        if (!id) throw new Error("usage: capture <order-id>");
        const order = await pp.getOrder(id).catch(() => null);
        const amt = order?.purchase_units?.[0]?.amount;
        const summary = `Capture order ${id}` + (amt ? ` — ${amt.value} ${amt.currency_code}` : "");
        if (!(await confirm(summary, args))) return console.error("Aborted.");
        print(await pp.captureOrder(id));
        return;
      }

      case "refund": {
        const id = args._[0];
        if (!id) throw new Error("usage: refund <capture-id> [--amount ...]");
        const summary =
          `Refund capture ${id} — ` + (args.amount ? `${args.amount} ${args.currency || "USD"}` : "FULL amount");
        if (!(await confirm(summary, args))) return console.error("Aborted.");
        print(await pp.refund(id, { amount: args.amount, currency: args.currency, note: args.note }));
        return;
      }

      case "payout": {
        const summary = `Pay ${args.amount} ${args.currency || "USD"} to ${args.email}`;
        if (!(await confirm(summary, args))) return console.error("Aborted.");
        print(
          await pp.payout({
            email: args.email,
            amount: args.amount,
            currency: args.currency,
            note: args.note,
          })
        );
        return;
      }

      default:
        console.error(`Unknown command: ${cmd}\n`);
        console.log(HELP);
        process.exitCode = 1;
    }
  } catch (e) {
    console.error(`\n✖ ${e.message}`);
    if (e.hint) console.error(`  ↳ ${e.hint}`);
    if (e.body?.details) console.error("  details:", JSON.stringify(e.body.details));
    process.exitCode = 1;
  }
}

main();
