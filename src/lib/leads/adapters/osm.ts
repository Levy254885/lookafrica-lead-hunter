import { Errors } from '@/lib/errors';
import { log } from '@/lib/logger';
import { CATEGORY_BY_ID, COUNTRIES, COUNTRY_LABEL } from '@/lib/leads/catalog';
import { normalizeEmail, normalizePhone, normalizeWebsite } from '@/lib/leads/normalize';
import type { LeadSourceAdapter, SearchParams, SourceStatus } from '@/lib/leads/adapters/types';
import type { LeadCandidate } from '@/lib/types';

/**
 * OpenStreetMap business data via the Overpass API.
 *
 * Why this source: OpenStreetMap data is open (ODbL) and Overpass is a documented query API.
 * Requirements to respect: attribute "(c) OpenStreetMap contributors", keep query volume within the
 * public instance's fair-use limits (use your own instance for volume), and send an identifying
 * User-Agent. Terms and the ODbL share-alike condition should be confirmed by the operator before
 * launch; see docs/DATA_SOURCES.md. Contributors enter this data voluntarily, so coverage varies
 * by city and category and absence of a record or a website tag proves nothing.
 */

const DEFAULT_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

/**
 * Endpoints to try, in order. OVERPASS_URL goes first when it is a valid URL (stray quotes, spaces or a
 * pasted "OVERPASS_URL=" prefix are tolerated); the public mirrors follow so one busy server does not
 * break search.
 */
export function overpassEndpoints(): string[] {
  const raw = (process.env.OVERPASS_URL ?? '').trim().replace(/^OVERPASS_URL\s*=\s*/, '').replace(/^['"]|['"]$/g, '').trim();
  const list: string[] = [];
  if (raw) {
    try {
      const u = new URL(raw);
      if (u.protocol === 'https:' || u.protocol === 'http:') list.push(u.toString());
    } catch {
      // Invalid value: ignore it and use the defaults.
    }
  }
  for (const d of DEFAULT_ENDPOINTS) if (!list.includes(d)) list.push(d);
  return list;
}

const ENDPOINT = () => overpassEndpoints()[0];
const NAME_PATTERN = /^[\p{L}\p{N} '-]{2,60}$/u;

export function sanitizeAreaName(raw: string): string {
  const t = raw.trim();
  if (!NAME_PATTERN.test(t)) {
    throw Errors.badRequest('City or region may contain only letters, numbers, spaces, hyphens and apostrophes.');
  }
  return t.replace(/"/g, '');
}

export function buildOverpassQuery(p: SearchParams): string {
  const country = COUNTRIES.find((c) => c.code === p.country);
  if (!country) throw Errors.badRequest('Unsupported country.');
  const category = CATEGORY_BY_ID[p.category];
  if (!category) throw Errors.badRequest('Unsupported category.');
  const area = sanitizeAreaName(p.city);
  const web = p.websiteStatus === 'with' ? '["website"]' : p.websiteStatus === 'without' ? '[!"website"][!"contact:website"]' : '';
  const limit = Math.max(1, Math.min(100, Math.floor(p.limit)));
  const filters = category.osmFilters.map((f) => `  nwr${f}["name"]${web}(area.a);`).join('\n');
  return [
    '[out:json][timeout:25];',
    `area["ISO3166-1"="${country.code}"][admin_level=2]->.country;`,
    `rel(area.country)["boundary"="administrative"]["name"~"^${area}$",i];`,
    'map_to_area->.a;',
    '(',
    filters,
    ');',
    `out tags center ${limit};`,
  ].join('\n');
}

interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function checkDate(tags: Record<string, string>): string | null {
  const raw = tags['check_date'];
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const t = Date.parse(`${raw}T00:00:00Z`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export function elementToCandidate(
  el: OsmElement,
  ctx: { country: string; city: string; category: string; retrievedAt: string },
): LeadCandidate | null {
  const tags = el.tags ?? {};
  const name = tags.name?.trim();
  if (!name) return null;
  const rawType = tags.shop ?? tags.amenity ?? tags.office ?? tags.craft ?? tags.tourism ?? tags.healthcare ?? ctx.category;
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const address = [street, tags['addr:suburb'], tags['addr:city']].filter(Boolean).join(', ') || null;
  const point = el.center ?? (el.lat !== undefined && el.lon !== undefined ? { lat: el.lat, lon: el.lon } : null);
  const sourceId = `${el.type}/${el.id}`;
  return {
    name: name.slice(0, 120),
    category: ctx.category,
    categoryLabel: titleCase(rawType).slice(0, 60),
    city: (tags['addr:city'] ?? ctx.city).slice(0, 80),
    country: ctx.country,
    address: address ? address.slice(0, 200) : null,
    lat: point ? point.lat : null,
    lng: point ? point.lon : null,
    website: normalizeWebsite(tags.website ?? tags['contact:website']),
    phone: normalizePhone(tags.phone ?? tags['contact:phone'] ?? tags['contact:mobile']),
    email: normalizeEmail(tags.email ?? tags['contact:email']),
    provenance: {
      source: 'osm',
      sourceLabel: 'OpenStreetMap',
      sourceId,
      sourceUrl: `https://www.openstreetmap.org/${sourceId}`,
      retrievedAt: ctx.retrievedAt,
      license: 'ODbL 1.0',
      attribution: '© OpenStreetMap contributors',
      lastVerifiedAt: checkDate(tags),
    },
  };
}

const ATTEMPT_TIMEOUT_MS = 27_000;
const TOTAL_BUDGET_MS = 50_000;

async function runQuery(query: string): Promise<OsmElement[]> {
  const contact = process.env.APP_CONTACT_EMAIL ? ` (${process.env.APP_CONTACT_EMAIL})` : '';
  const started = Date.now();
  let sawBusy = false;
  let lastCause = 'no response';
  for (const url of overpassEndpoints()) {
    if (Date.now() - started > TOTAL_BUDGET_MS - 8_000) break;
    const host = new URL(url).host;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'application/json',
          'user-agent': `LookAfricaLeadHunter/1.0${contact}`,
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, TOTAL_BUDGET_MS - (Date.now() - started))),
      });
      if (res.status === 429 || res.status >= 500) {
        sawBusy = true;
        lastCause = `${host} answered HTTP ${res.status}`;
        log('warn', 'overpass_busy', { host, status: res.status });
        continue;
      }
      if (!res.ok) {
        log('warn', 'overpass_rejected', { host, status: res.status });
        throw Errors.unavailable('source_error', `The OpenStreetMap data service returned HTTP ${res.status}.`);
      }
      const json = (await res.json()) as { elements?: OsmElement[]; remark?: string };
      if (json.remark && /runtime error|timed out|out of memory/i.test(json.remark)) {
        sawBusy = true;
        lastCause = `${host} could not finish the query in time`;
        log('warn', 'overpass_remark', { host, remark: json.remark.slice(0, 200) });
        continue;
      }
      return json.elements ?? [];
    } catch (err) {
      if (err instanceof Error && 'status' in err) throw err;
      const e = err as { name?: string; message?: string; cause?: { code?: string } };
      lastCause = `${host}: ${e.cause?.code ?? e.name ?? 'network error'}`;
      log('warn', 'overpass_unreachable', { host, name: e.name, message: e.message, code: e.cause?.code });
    }
  }
  if (sawBusy) {
    throw Errors.unavailable('source_busy', 'The OpenStreetMap data service is busy right now. Wait a minute and try again, or choose a narrower category.');
  }
  throw Errors.unavailable('source_unreachable', `The OpenStreetMap data service could not be reached (${lastCause}). Try again shortly.`);
}

export const osmAdapter: LeadSourceAdapter = {
  id: 'osm',

  status(): SourceStatus {
    return {
      id: 'osm',
      label: 'OpenStreetMap (Overpass API)',
      kind: 'leads',
      available: true,
      reason: process.env.APP_CONTACT_EMAIL
        ? undefined
        : 'Available. Set APP_CONTACT_EMAIL so requests identify the operator, as the Overpass usage policy asks.',
      endpoint: ENDPOINT(),
      auth: 'None for the public instance.',
      quota: 'Fair-use limits on the public instance. Results are cached for 6 hours to reduce load.',
      cost: 'Free on the public instance. Self-host or use a paid instance for production volume.',
      attribution: '© OpenStreetMap contributors, shown with every record.',
      reuse: 'Open Database Licence (ODbL). Confirm share-alike obligations for derived databases with counsel.',
      refresh: 'Search results cached 6 hours; individual records re-read after 24 hours.',
      docsUrl: 'https://wiki.openstreetmap.org/wiki/Overpass_API',
    };
  },

  async search(params: SearchParams): Promise<LeadCandidate[]> {
    const query = buildOverpassQuery(params);
    const retrievedAt = new Date().toISOString();
    const elements = await runQuery(query);
    const seen = new Set<string>();
    const out: LeadCandidate[] = [];
    for (const el of elements) {
      const c = elementToCandidate(el, {
        country: params.country,
        city: params.city.trim(),
        category: params.category,
        retrievedAt,
      });
      if (!c || seen.has(c.provenance.sourceId)) continue;
      seen.add(c.provenance.sourceId);
      out.push(c);
    }
    return out;
  },

  async fetchById(sourceId: string): Promise<LeadCandidate | null> {
    const m = sourceId.match(/^(node|way|relation)\/(\d{1,12})$/);
    if (!m) throw Errors.badRequest('Invalid source id.');
    const elements = await runQuery(`[out:json][timeout:25];\n${m[1]}(${m[2]});\nout tags center;`);
    const el = elements[0];
    if (!el) return null;
    const country = (el.tags?.['addr:country'] ?? '').toUpperCase();
    // Direct lookups carry no search context, so country and category stay unknown rather than guessed.
    return elementToCandidate(el, {
      country: COUNTRY_LABEL[country] ? country : '',
      city: el.tags?.['addr:city'] ?? '',
      category: 'other',
      retrievedAt: new Date().toISOString(),
    });
  },
};
