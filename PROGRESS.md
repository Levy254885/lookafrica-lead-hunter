# Progress log and honest status

Last updated 2026-10-26.

## Verification performed

The build sandbox blocked `registry.npmjs.org` (HTTP 403 from the egress proxy), so **dependencies were never installed, `next build` was never run, and the app was never started.** What was verified:

- The pure-logic modules (entitlements, plans, audit findings and HTML analysis, SSRF classification, scoring, normalization, CSV, payment verification, OSM/Remotive mapping, draft generation) were compiled with TypeScript in `strict` mode against Node types with no errors, and the 7 unit-test files (**89 test cases**) **passed** when executed with a small stand-in for Vitest's `describe/it/expect` (real Vitest was unavailable). This run found and fixed one real bug (leading whitespace in email/website normalization).
- All other files (React components, pages, API routes, Firebase-dependent services) were only syntax-checked. Their type errors cannot be assessed without React, Next and Firebase type packages.
- `firestore.rules` and the rules tests, the Playwright smoke tests, and every live integration (Firebase, Overpass, PageSpeed, Remotive, Pesapal, the AI API) have **not been run**.

First step on a machine with network access: `npm install && npm run typecheck && npm test && npm run build`, then fix whatever the compiler reports. Expect some type errors in untested files.

## What is built

Public site (home, pricing, help, privacy, terms, contact), email/password and Google auth with server session cookies, email-verification gate, app shell with all ten navigation areas, overview with real persisted numbers and empty states, lead search (OpenStreetMap) with cache, dedupe, provenance and saved searches, lead detail with score explanation, notes, tags, follow-ups, archive, SSRF-guarded website audits with background execution, evidence-based findings and PageSpeed, pipeline table and board with CSV export, evidence-only proposal drafts (template, or AI when configured) with opt-out list, billing page with usage meters and history, Pesapal checkout with server-verified activation, cancellation, grace and expiry logic, admin overview, deployable Firestore rules and indexes, plan config overridable from Firestore.

## What needs credentials or operator action

Firebase project and service account; `PAGESPEED_API_KEY` (recommended); `ANTHROPIC_API_KEY` (AI drafts; template drafts work without); Pesapal sandbox/live credentials and IPN registration; `REMOTIVE_TERMS_CONFIRMED=true` after reading terms; `CRON_SECRET`; contact email; legal review.

## Known gaps and deviations from the brief

- **Pesapal endpoint and field names are from memory of the public docs plus one confirmed page; unverified against a real account.** Payments are untested end to end.
- Recurring billing is not offered for M-Pesa (no supported method found). Renewal is manual.
- **No Kenyan procurement or local freelance source is connected.** Projects come from Remotive (remote jobs) and only when enabled.
- Teams, shared pipeline and Agency team workspace are **not implemented** (plan flags exist; `teamId` is reserved on documents). The pricing comparison marks it "Planned".
- Automated outreach sending is deliberately not implemented. Only drafts, opt-out list and manual "I sent this" tracking exist.
- Project alerts and automated discovery/scoring on the Pro plan have feature flags but **no implementation**.
- Pipeline statuses are fixed to the default ten; the data model supports per-user lists but there is no editor.
- Lead details show no per-field contact verification beyond the source label; audits cover the home page plus up to 10 internal links only.
- Admin console is read-mostly: no plan-edit form (use `PUT /api/admin/plans`), no duplicate review, abuse reports or per-user usage view.
- Dark theme tokens exist; there is no manual theme toggle.
- Rate limiting is Firestore-backed fixed windows (adequate for MVP, adds read/write cost).
- App Check headers are sent when configured but not enforced server-side.
- Unit tests exist for pure logic only. There are no integration tests for the Firestore-backed services, no concurrency test against the emulator, and the Playwright suite is a smoke test.
- Privacy and terms are drafts flagged for legal review. Agency AI allowance (1000) and automation limits are engineering defaults.
- Search results cache `sourceRecords` server-side and saving uses only server-held records, but the cache docs are not size-capped beyond the 100-result limit.

## Next concrete steps

1. Install, typecheck, build, fix compile errors.
2. Run the emulator rules tests; run the app against the emulators and walk the journey in the brief.
3. Pesapal sandbox checklist.
4. Implement teams and project alerts, or remove them from the Pro/Agency plan copy.
5. Add a Kenyan procurement source after a terms check.


## Design refresh
Redesigned to match the supplied reference screens: landing page, app shell and Find Leads table, with a Inter font, white/black/grey palette with a vivid purple accent and a persistent light/dark toggle. See `docs/DESIGN.md`. Presentation only: no routes, APIs, rules or business logic changed. Like the rest of the app, the new React components have not been built or run here (npm was unreachable); only syntax was checked with TypeScript.
