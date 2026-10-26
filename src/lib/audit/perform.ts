import { analyzeHtml, analyzeRobotsTxt } from '@/lib/audit/html';
import { buildFindings, deriveOpportunities, summarize, type AuditInputs } from '@/lib/audit/findings';
import { runPageSpeed } from '@/lib/audit/pagespeed';
import { safeFetch, SafeFetchError, validatePublicUrl } from '@/lib/audit/ssrf';
import type { Finding, OpportunityIndicator } from '@/lib/types';
import type { PageSpeedResult } from '@/lib/audit/pagespeed';

export interface AuditResult {
  checkedAt: string;
  finalUrl: string | null;
  httpStatus: number | null;
  responseTimeMs: number | null;
  redirectChain: { url: string; status: number }[];
  findings: Finding[];
  pagespeed: PageSpeedResult;
  summary: ReturnType<typeof summarize>;
  opportunities: OpportunityIndicator[];
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function checkHttpRedirect(host: string): Promise<AuditInputs['httpRedirect']> {
  try {
    const res = await safeFetch(`http://${host}/`, { maxBytes: 1, timeoutMs: 8000, maxRedirects: 3 });
    return { state: res.finalUrl.startsWith('https://') ? 'redirects_to_https' : 'stays_http' };
  } catch (err) {
    return { state: 'unavailable', detail: `The HTTP version could not be checked (${(err as SafeFetchError).code ?? 'error'}).` };
  }
}

async function checkRobots(origin: string): Promise<AuditInputs['robots']> {
  try {
    const res = await safeFetch(`${origin}/robots.txt`, { maxBytes: 200_000, timeoutMs: 8000, maxRedirects: 3 });
    const looksLikeHtml = /^\s*</.test(res.body);
    if (res.status === 404 || res.status === 410 || (res.status === 200 && looksLikeHtml)) {
      return { state: 'missing', blocksAll: false, sitemaps: [] };
    }
    if (res.status !== 200) {
      return { state: 'unavailable', blocksAll: false, sitemaps: [], detail: `robots.txt returned HTTP ${res.status}.` };
    }
    const parsed = analyzeRobotsTxt(res.body);
    return { state: 'found', ...parsed };
  } catch (err) {
    return {
      state: 'unavailable',
      blocksAll: false,
      sitemaps: [],
      detail: `robots.txt could not be fetched (${(err as SafeFetchError).code ?? 'error'}).`,
    };
  }
}

async function checkSitemap(origin: string, declared: string[]): Promise<AuditInputs['sitemap']> {
  const candidate = declared[0] ?? `${origin}/sitemap.xml`;
  try {
    const res = await safeFetch(candidate, { maxBytes: 100_000, timeoutMs: 8000, maxRedirects: 3 });
    if (res.status === 200 && /<urlset|<sitemapindex/i.test(res.body)) return { state: 'found', url: candidate };
    if (res.status === 404 || res.status === 410 || res.status === 200) return { state: 'missing' };
    return { state: 'unavailable' };
  } catch {
    return { state: 'unavailable' };
  }
}

async function checkLinks(links: string[], pageUrl: string): Promise<AuditInputs['links']> {
  const sample = links.filter((l) => l !== pageUrl).slice(0, 10);
  if (sample.length === 0) return { checked: 0, found: links.length, broken: [] };
  const results = await mapLimit(sample, 5, async (link) => {
    try {
      let res = await safeFetch(link, { method: 'HEAD', timeoutMs: 6000, maxRedirects: 3 });
      if (res.status === 405 || res.status === 501) {
        res = await safeFetch(link, { method: 'GET', maxBytes: 1, timeoutMs: 6000, maxRedirects: 3 });
      }
      // 401, 403 and 429 are usually bot protection or access rules, not broken pages, so they are not counted.
      const broken = res.status === 404 || res.status === 410 || res.status >= 500;
      return broken ? { url: link, status: res.status as number | string } : null;
    } catch (err) {
      return { url: link, status: (err as SafeFetchError).code ?? 'error' };
    }
  });
  return {
    checked: sample.length,
    found: links.length,
    broken: results.filter((r): r is { url: string; status: number | string } => r !== null),
  };
}

/** Runs every check for a public URL. The URL is validated again here; callers are not trusted. */
export async function performAudit(inputUrl: string): Promise<AuditResult> {
  const checked = validatePublicUrl(inputUrl);
  if (!checked.ok) throw new SafeFetchError('invalid_url', checked.reason);
  const url = checked.url.toString();
  const checkedAt = new Date().toISOString();

  const pagespeedPromise = runPageSpeed(url);

  let main: AuditInputs['main'];
  try {
    const res = await safeFetch(url, {
      maxBytes: 1_500_000,
      timeoutMs: 15_000,
      headers: { accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5' },
    });
    const contentType = typeof res.headers['content-type'] === 'string' ? res.headers['content-type'] : null;
    const isHtml = contentType === null || /html/i.test(contentType);
    main = {
      ok: true,
      finalUrl: res.finalUrl,
      status: res.status,
      responseTimeMs: res.elapsedMs,
      redirects: res.redirects,
      facts: isHtml ? analyzeHtml(res.body, res.finalUrl) : null,
      contentType,
      truncated: res.truncated,
    };
  } catch (err) {
    const e = err as SafeFetchError;
    main = { ok: false, code: e.code ?? 'error', message: e.message };
  }

  let httpRedirect: AuditInputs['httpRedirect'] = { state: 'unavailable' };
  let robots: AuditInputs['robots'] = { state: 'unavailable', blocksAll: false, sitemaps: [] };
  let sitemap: AuditInputs['sitemap'] = { state: 'unavailable' };
  let links: AuditInputs['links'] = null;

  if (main.ok) {
    const finalUrl = new URL(main.finalUrl);
    const origin = finalUrl.origin;
    const [redirectResult, robotsResult, linkResult] = await Promise.all([
      finalUrl.protocol === 'https:' ? checkHttpRedirect(finalUrl.host) : Promise.resolve(httpRedirect),
      checkRobots(origin),
      main.facts ? checkLinks(main.facts.internalLinks, main.finalUrl) : Promise.resolve(null),
    ]);
    httpRedirect = redirectResult;
    robots = robotsResult;
    links = linkResult;
    sitemap = await checkSitemap(origin, robots.sitemaps);
  }

  const pagespeed = await pagespeedPromise;
  const findings = buildFindings({ checkedAt, main, httpRedirect, robots, sitemap, links, pagespeed });

  return {
    checkedAt,
    finalUrl: main.ok ? main.finalUrl : null,
    httpStatus: main.ok ? main.status : null,
    responseTimeMs: main.ok ? main.responseTimeMs : null,
    redirectChain: main.ok ? main.redirects : [],
    findings,
    pagespeed,
    summary: summarize(findings),
    opportunities: deriveOpportunities(findings),
  };
}
