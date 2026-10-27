# Payments

## Provider choice

Pesapal API 3.0 is implemented because it offers hosted checkout covering M-Pesa and cards for Kenyan merchants and a server-side transaction status API that lets the server verify payments independently.

What was confirmed from Pesapal's documentation during the build: recurring (subscription) payments are supported for **cards only** (Visa and Mastercard); no mobile-money recurring support is documented; the IPN carries limited data and the merchant must call GetTransactionStatus for the authoritative result.

What was **not** verified: merchant approval requirements, fees, settlement terms, and exact endpoint and field names beyond the recurring page. Safaricom's M-Pesa Ratiba standing-order feature exists for consumers, but nothing found shows merchants can bill through it, so it is not used. Direct Daraja STK Push is one-off. Flutterwave was not evaluated.

## Renewal model

Because M-Pesa is one-off, **renewals are manual**: each payment buys one period (`periodDays`, default 30). Paying again before the period ends extends from the current end date. The UI says this plainly. Card users may opt into recurring billing on Pesapal's page; IPNs of type RECURRING are verified and applied by the same path (this is untested against the real service).

## Flow

1. `POST /api/billing/checkout` (verified email required): creates a `payments` document (`initiated`, expected amount and plan fixed server-side), submits the order with the payment id as merchant reference, returns the Pesapal redirect URL.
2. The user pays on Pesapal and returns to `/app/billing?payment=<id>`. The page only calls `POST /api/billing/verify`; the redirect itself grants nothing.
3. Pesapal calls `/api/billing/pesapal/ipn`. Pesapal does not sign IPNs, so the handler treats the tracking id as an untrusted lookup key and calls GetTransactionStatus.
4. `verifyAgainstExpected` requires: merchant reference equals our payment id, tracking id equals the stored one, status code 1, currency KES, amount equals the stored amount. Any mismatch is recorded as a rejection and never activates.
5. Activation runs in one Firestore transaction that re-reads the payment (idempotent: a completed payment returns `already_processed`), writes the subscription period and marks the payment completed.
6. The daily cron and an admin button re-verify unfinished payments (`reconcile`).

## Behaviour rules

- Grace period: `graceDays` (default 3) of paid access after a period ends; none if renewal was cancelled. Then Free limits apply and data is kept.
- Upgrade: new period from now, no proration (stated at checkout). Downgrade: blocked until the period ends.
- Cancel: stops renewal; access continues to period end. No provider-side cancel exists for one-off payments.
- Failed payment: marked `failed`; no entitlement change.
- Webhook events are logged in `webhookEvents` without secrets.

## Setup checklist (sandbox first)

1. Create a Pesapal sandbox merchant, set `PESAPAL_ENV=sandbox`, `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`, `APP_URL`.
2. Register the IPN URL `${APP_URL}/api/billing/pesapal/ipn` with Pesapal's RegisterIPN endpoint (GET notification type) and set the returned id as `PESAPAL_IPN_ID`.
3. Run a sandbox checkout for each plan. Confirm field names against Pesapal's current docs, especially `GetTransactionStatus` fields (`status_code`, `amount`, `currency`, `merchant_reference`).
4. Test: a duplicate IPN (no double extension), an underpaid amount, a failed payment, an unknown tracking id.
5. Only then switch to `live`.
