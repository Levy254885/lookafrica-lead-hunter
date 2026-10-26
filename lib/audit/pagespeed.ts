/**
 * PageSpeed Insights API v5 client.
 * Docs: https://developers.google.com/speed/docs/insights/v5/get-started
 *
 * Google fetches and analyzes the page itself. Scores here are Google's measurements, reported as
 * returned. When the API is unavailable the result says so; nothing is estimated.
 */

export interface FieldMetric {
  percentile: number;
  category: string;
}

export interface PageSpeedResult {
  available: boolean;
  reason?: string;
  fetchedAt: string;
  strategy: 'mobile';
  scores?: {
    performance: number | null;
    accessibility: number | null;
    seo: number | null;
    bestPractices: number | null;
  };
  lab?: {
    lcpMs: number | null;
    cls: number | null;
    tbtMs: number | null;
    fcpMs: number | null;
    speedIndexMs: number | null;
  };
  field?: {
    scope: 'url' | 'origin';
    lcp: FieldMetric | null;
    cls: FieldMetric | null;
    inp: FieldMetric | null;
  } | null;
  lighthouseVersion?: string;
}

const ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function score(categories: Json | undefined, key: string): number | null {
  const s = categories?.[key]?.score;
  return typeof s === 'number' ? Math.round(s * 100) : null;
}

function num(audits: Json | undefined, key: string): number | null {
  const v = audits?.[key]?.numericValue;
  return typeof v === 'number' ? v : null;
}

function field(metrics: Json | undefined, key: string): FieldMetric | null {
  const m = metrics?.[key];
  if (!m || typeof m.percentile !== 'number') return null;
  return { percentile: m.percentile, category: String(m.category ?? 'UNKNOWN') };
}

export function parsePageSpeed(json: Json, fetchedAt: string): PageSpeedResult {
  const lh = json.lighthouseResult as Json | undefined;
  if (!lh) {
    return { available: false, reason: 'PageSpeed returned no Lighthouse result.', fetchedAt, strategy: 'mobile' };
  }
  const exp = (json.loadingExperience as Json | undefined) ?? undefined;
  const metrics = exp?.metrics as Json | undefined;
  const hasField = metrics && Object.keys(metrics).length > 0;
  return {
    available: true,
    fetchedAt,
    strategy: 'mobile',
    scores: {
      performance: score(lh.categories, 'performance'),
      accessibility: score(lh.categories, 'accessibility'),
      seo: score(lh.categories, 'seo'),
      bestPractices: score(lh.categories, 'best-practices'),
    },
    lab: {
      lcpMs: num(lh.audits, 'largest-contentful-paint'),
      cls: num(lh.audits, 'cumulative-layout-shift'),
      tbtMs: num(lh.audits, 'total-blocking-time'),
      fcpMs: num(lh.audits, 'first-contentful-paint'),
      speedIndexMs: num(lh.audits, 'speed-index'),
    },
    field: hasField
      ? {
          scope: exp?.origin_fallback ? 'origin' : 'url',
          lcp: field(metrics, 'LARGEST_CONTENTFUL_PAINT_MS'),
          cls: field(metrics, 'CUMULATIVE_LAYOUT_SHIFT_SCORE'),
          inp: field(metrics, 'INTERACTION_TO_NEXT_PAINT'),
        }
      : null,
    lighthouseVersion: typeof lh.lighthouseVersion === 'string' ? lh.lighthouseVersion : undefined,
  };
}

export async function runPageSpeed(url: string): Promise<PageSpeedResult> {
  const fetchedAt = new Date().toISOString();
  const params = new URLSearchParams({ url, strategy: 'mobile' });
  for (const c of ['performance', 'accessibility', 'seo', 'best-practices']) params.append('category', c);
  const key = process.env.PAGESPEED_API_KEY;
  if (key) params.set('key', key);

  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, { signal: AbortSignal.timeout(75_000) });
    if (res.status === 429) {
      return {
        available: false,
        fetchedAt,
        strategy: 'mobile',
        reason: key
          ? 'The PageSpeed Insights daily quota was exceeded (HTTP 429). Try again later.'
          : 'The PageSpeed Insights quota without an API key was exceeded (HTTP 429). Set PAGESPEED_API_KEY to raise the quota.',
      };
    }
    if (!res.ok) {
      let detail = '';
      try {
        const body = (await res.json()) as Json;
        detail = String(body?.error?.message ?? '').slice(0, 200);
      } catch {
        // ignore unreadable error body
      }
      return {
        available: false,
        fetchedAt,
        strategy: 'mobile',
        reason: `PageSpeed Insights returned HTTP ${res.status}${detail ? `: ${detail}` : ''}.`,
      };
    }
    return parsePageSpeed((await res.json()) as Json, fetchedAt);
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return {
      available: false,
      fetchedAt,
      strategy: 'mobile',
      reason: timedOut ? 'PageSpeed Insights did not respond in time.' : 'PageSpeed Insights could not be reached.',
    };
  }
}
