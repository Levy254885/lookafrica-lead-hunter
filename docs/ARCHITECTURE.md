# Architecture

Next.js (App Router) + TypeScript + Tailwind on Vercel. Firebase Authentication, Cloud Firestore and the Admin SDK for the backend.

## Trust model

- The browser holds a Firebase Auth identity and exchanges a fresh ID token for an HTTP-only **session cookie** (`POST /api/session`, Admin `createSessionCookie`). Every page and API route verifies the cookie with revocation checks (`verifySession`). The user id always comes from the verified cookie, never from request input.
- **No Firestore client SDK ships to the browser.** All data access goes through server routes or server components using the Admin SDK. Admin SDK access bypasses security rules, so every server function enforces ownership itself (`getOwnedLead`, owner checks in each route). `firestore.rules` is defence in depth: clients can read their own data and write almost nothing.
- Admin status is a **custom auth claim** set by `scripts/set-admin.ts`, never a Firestore field.
- Mutating routes require a same-origin `Origin` header and the session cookie is `SameSite=Lax`.
- Entitlements are computed server-side from `subscriptions` (written only by verified payment handling) and `usage` (written only inside transactions).

## Page map

Public: `/`, `/pricing`, `/help`, `/privacy`, `/terms`, `/contact`, `/login`, `/signup`, `/forgot-password`.
App (`/app/*`): overview, leads, leads/[id], audits, audits/[id], projects, pipeline, outreach, saved-searches, billing, settings, help.
Admin: `/admin`.

## Module map (`src/lib`)

| Module | Purpose |
|---|---|
| `plans.ts`, `entitlements-core.ts` | Plan config (defaults + Firestore override) and pure entitlement logic (unit tested) |
| `entitlements.ts` | Firestore-backed service: `getEntitlements`, `requireFeature`, transactional `reserveUsage` / `releaseUsage` |
| `audit/ssrf.ts` | URL validation, IP classification, DNS-pinned guarded fetch, per-hop redirect checks, size and time limits |
| `audit/html.ts`, `findings.ts`, `pagespeed.ts`, `perform.ts` | Audit checks, findings with evidence, PageSpeed client, orchestration |
| `audit/service.ts`, `run.ts` | Job creation (cache reuse, usage reservation) and execution (claim transaction, failure refund, stale recovery) |
| `leads/adapters/*`, `sources.ts` | Source-adapter contract and registry (OpenStreetMap implemented) |
| `leads/normalize.ts`, `service.ts` | Normalization, dedupe keys, search with 6h cache, save with deterministic ids |
| `scoring.ts` | Five-factor explainable prioritization estimate |
| `proposals/*` | Evidence-only fact sheet, template and AI drafting, suppression checks |
| `payments/*` | Pesapal client, pure verification, checkout/verify/apply/cancel/reconcile |
| `projects/*` | Remotive adapter (off until terms confirmed) and refresh with lock |

## Audit job lifecycle

`POST /api/audits` validates the URL, reuses an in-flight or recent (24h) audit for free, otherwise reserves one audit in a transaction and creates a `pending` document, then runs `executeAudit` via `after()`. `executeAudit` claims the job in a transaction (`pending` to `running`), so two workers cannot run it. Failures mark the job `failed` and refund the reservation. The daily cron restarts audits stuck in `pending` and fails ones stuck in `running` over 10 minutes (refunding). The UI polls `GET /api/audits/[id]`.

For heavy volume, move `executeAudit` to a queue worker (Cloud Tasks or Cloud Functions); the claim transaction already makes that safe.

## Data model

Retention: configure Firestore TTL policies on `expiresAt` for `activityLogs`, `rateLimits`, `searchCache`, `sourceRecords`, `webhookEvents`.

| Collection | Doc id | Owner / tenant | Key fields | Access | Retention |
|---|---|---|---|---|---|
| `users` | uid | self | displayName, country, services, pipelineStatuses | Owner reads; client may update displayName, country, services only (validated). Created server-side | Until account deletion |
| `subscriptions` | uid | self | planId, status, currentPeriodStart/End, cancelAtPeriodEnd, lastPaymentId | Owner read; server write only | Deleted with account |
| `usage` | `{uid}_{YYYY-MM}` | ownerId | leads, audits, drafts | Owner read; server transactions only | Deleted with account |
| `payments` | auto | uid | planId, mode, amountKes, currency, status, orderTrackingId, verifiedAt | Owner read; server write only | Kept, anonymised on account deletion |
| `leads` | sha256(owner:dedupeKey) | ownerId (teamId reserved) | name, website, provenance, fieldEvidence, status, notes, tags, followUpAt, score, opportunities, latestAuditId | Owner/team read; server write only | Until deleted |
| `audits` | auto | ownerId | url, status, findings[], pagespeed, summary, opportunities, cacheKey | Owner/team read; server write only | Until deleted |
| `outreach` | auto | ownerId | leadId, subject, body, generator, basedOn, status, suppressed | Owner/team read; server write only | Until deleted |
| `savedSearches` | auto | ownerId | saved, name, params | Owner read; server write only | History capped at 50 |
| `suppressions` | hash | ownerId | type, value | Owner read; server write only | Until deleted |
| `activityLogs` | auto | ownerId | type, summary, leadId, expiresAt | Owner/team read; server write only | 365 days |
| `projects` | sha256(source:id) | shared | title, organization (unverified), url, status, lastCheckedAt | Verified-email users read; server write only | Refreshed every 6h |
| `systemConfig` | `plans` | system | plans, graceDays, periodDays | Signed-in read of `plans`; server write only | Permanent |
| `sourceState`, `sourceRecords`, `searchCache`, `rateLimits`, `webhookEvents`, `adminAuditLogs` | various | server | operational | No client access | TTL as above |

Required fields and validation are enforced in server code (zod) and, for the `users` update path, in the rules. Indexes are in `firestore.indexes.json`.

## Scoring

Five factors with fixed maxima: website issues (40, from measured findings only), service match (20), public contact channel (15), data freshness (10, capped at 5 when the source gives no verification date), explicit buying signal (15, only when recorded). Missing evidence scores zero and is labelled unknown, not negative. The result is labelled a prioritization estimate, not a probability.
