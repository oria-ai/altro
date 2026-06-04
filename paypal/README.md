# paypal-agent

A small, zero-dependency agent for managing a **live** PayPal account: accept
payments, refunds, transaction/balance reads, and payouts.

Secrets never live in this repo. They're stored in **Doppler** (`oria` project,
`prd` config) as `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`, and injected at
runtime with `doppler run`.

## Run

```bash
cd paypal
# every command goes through doppler so creds are injected, never on disk:
doppler run --project oria --config prd -- node bin/pp.mjs whoami
```

`whoami` shows which capabilities the PayPal app actually has enabled.

### Reads (safe, no money moves)
```bash
… pp.mjs whoami
… pp.mjs balance                  # needs Transaction Search feature
… pp.mjs transactions --days 30   # needs Transaction Search feature
… pp.mjs order <order-id>
```

### Accept payments
```bash
… pp.mjs create --amount 10.00 --currency USD --description "Test order"
… pp.mjs capture <order-id>       # ⚠️ charges the buyer
```

### Refunds
```bash
… pp.mjs refund <capture-id> --amount 5.00   # omit --amount for full refund  ⚠️
```

### Payouts
```bash
… pp.mjs payout --email someone@example.com --amount 10.00   # ⚠️ needs Payouts (PayPal-approved)
```

## Safety

Money-moving commands (`capture`, `refund`, `payout`) print the exact amount and
refuse to run until you type `yes` at the prompt — or pass `--yes` to skip it
(e.g. for automation). Reads run without prompting.

## Environment

- `PAYPAL_ENV` — `live` (default) or `sandbox`.
- Requires Node 18+ (uses built-in `fetch`). Developed on Node 22.

## Capability status

The app's granted scopes determine what works. As of setup:

| Capability         | Status                                    |
|--------------------|-------------------------------------------|
| Accept payments    | ✅ enabled                                |
| Refunds            | ✅ enabled                                |
| Transaction Search | ⛔ enable in Dashboard → app → Features   |
| Payouts            | ⛔ enable + PayPal approval required      |

Run `whoami` to see the current live state.
