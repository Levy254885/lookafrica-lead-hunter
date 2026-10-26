# Data sources

Operators must read each provider's current terms before enabling a source. Nothing here is legal advice, and details below were not all re-verified at build time (noted per source).

## OpenStreetMap via Overpass (leads) - implemented

- Endpoint: `OVERPASS_URL` (default `https://overpass-api.de/api/interpreter`), POST `data=<Overpass QL>`.
- Auth: none on the public instance. Quota: fair-use limits; the app caches searches for 6 hours and records for 24 hours and bounds queries (`timeout:25`, `out ... N`, N at most 100). Use a self-hosted or paid instance for production volume.
- Cost: free on the public instance.
- Attribution: "(c) OpenStreetMap contributors", shown with every record.
- Reuse: ODbL. Storing derived records in a database may trigger share-alike obligations; confirm with counsel before launch.
- Identification: set `APP_CONTACT_EMAIL` so the User-Agent identifies the operator.
- Errors: 429/503/504 and Overpass runtime remarks map to a "source busy" message; no results are fabricated.
- Caveat: OSM coverage of Kenyan businesses varies widely. Absence of a website tag proves nothing, and the UI says so.
- Status: query construction and mapping are unit tested. The live request has **not** been run from this repository (no outbound access in the build sandbox).

## Google PageSpeed Insights v5 (audits) - implemented

- Endpoint: `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`. Auth: optional `PAGESPEED_API_KEY`; without a key the shared quota is very low.
- 429 responses are surfaced as "unavailable" findings with the reason. Core Web Vitals field data is shown only when Google returns it.
- Status: response parsing is unit tested with synthetic JSON; the live call has not been run.

## Direct audit checks - implemented

HTTP fetches from our servers through the SSRF-guarded client (`audit/ssrf.ts`): redirects, HTTPS, HTML metadata, robots.txt, sitemap, up to 10 internal links (HEAD, with a GET fallback). Identifying User-Agent. These make requests to third-party sites only when a signed-in user asks for an audit of that address.

## Remotive remote jobs API (projects) - implemented, OFF by default

- Endpoint: `https://remotive.com/api/remote-jobs?category=software-dev&limit=100`. Auth: none.
- Enabled only when `REMOTIVE_TERMS_CONFIRMED=true`. The operator must read Remotive's current API terms and confirm that caching listing metadata with a link back is permitted. I could not retrieve those terms during the build.
- Stored: title, company name as reported (marked unverified), category, tags, location, published date, link. Not stored: descriptions, salaries, logos.
- Refresh: at most every 6 hours (lock in `sourceState/remotive`); disappeared listings are marked `not_in_latest_feed`.
- These are remote job listings, not Kenyan procurement notices. **No Kenyan public procurement source is connected.** Candidates to evaluate: the Kenya public procurement portal (PPIP) and county or agency feeds, each requiring a terms check before any automated access.

## Adding a source

Implement `LeadSourceAdapter` (`id`, `status()`, `search()`, `fetchById()`), return `LeadCandidate` objects with full `provenance`, and register it in `src/lib/sources.ts`. `status()` must return `available: false` with a reason when credentials or terms confirmation are missing; the UI then shows an unavailable state instead of fake results.
