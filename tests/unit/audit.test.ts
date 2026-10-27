import { describe, expect, it } from 'vitest';
import { buildFindings, deriveOpportunities, issueWeight, type AuditInputs } from '@/lib/audit/findings';
import { analyzeHtml, analyzeRobotsTxt } from '@/lib/audit/html';
import { parsePageSpeed } from '@/lib/audit/pagespeed';

const AT = '2026-10-25T10:00:00.000Z';

describe('analyzeHtml', () => {
  const html = `<!doctype html><html lang="en"><head>
    <title> Acme &amp; Sons </title>
    <meta name="description" content="We sell things">
    <meta name="viewport" content="width=device-width">
    <meta name="robots" content="noindex, nofollow">
    <link rel="canonical" href="https://acme.example/">
    <script>var x = "<title>fake</title><img src=a>";</script></head>
    <body><h1>Hi</h1><img src="a.png"><img src="b.png" alt=""><img src="c.png" alt="Logo">
    <a href="/about">About</a><a href="https://acme.example/contact#x">Contact</a><a href="https://other.example/">Ext</a><a href="mailto:a@b.c">m</a></body></html>`;
  const f = analyzeHtml(html, 'https://acme.example/');
  it('extracts head facts and ignores script contents', () => {
    expect(f.title).toBe('Acme & Sons');
    expect(f.metaDescription).toBe('We sell things');
    expect(f.canonical).toBe('https://acme.example/');
    expect(f.robotsMeta).toBe('noindex, nofollow');
    expect(f.viewport).toBe('width=device-width');
    expect(f.lang).toBe('en');
  });
  it('counts images and missing alt (empty alt is valid)', () => {
    expect(f.imgTotal).toBe(3);
    expect(f.imgMissingAlt).toBe(1);
    expect(f.h1Count).toBe(1);
  });
  it('collects only same-site http links', () => {
    expect(f.internalLinks).toEqual(['https://acme.example/about', 'https://acme.example/contact']);
  });
  it('reports a missing title as null rather than guessing', () => {
    expect(analyzeHtml('<html><body>x</body></html>', 'https://a.example/').title).toBeNull();
  });
});

describe('analyzeRobotsTxt', () => {
  it('finds sitemaps and a blanket disallow', () => {
    const r = analyzeRobotsTxt('User-agent: *\nDisallow: /\n# c\nSitemap: https://a.example/s.xml');
    expect(r.blocksAll).toBe(true);
    expect(r.sitemaps).toEqual(['https://a.example/s.xml']);
  });
  it('ignores disallow rules for other agents', () => {
    expect(analyzeRobotsTxt('User-agent: BadBot\nDisallow: /\n').blocksAll).toBe(false);
  });
});

describe('parsePageSpeed', () => {
  it('reports unavailable when there is no Lighthouse result', () => {
    const r = parsePageSpeed({}, AT);
    expect(r.available).toBe(false);
  });
  it('converts scores to 0-100 and keeps nulls as null', () => {
    const r = parsePageSpeed({ lighthouseResult: { categories: { performance: { score: 0.57 }, seo: { score: null } }, audits: {} } }, AT);
    expect(r.scores?.performance).toBe(57);
    expect(r.scores?.seo).toBeNull();
    expect(r.field).toBeNull();
  });
});

function inputs(over: Partial<AuditInputs> = {}): AuditInputs {
  return {
    checkedAt: AT,
    main: { ok: true, finalUrl: 'https://a.example/', status: 200, responseTimeMs: 400, redirects: [], contentType: 'text/html', truncated: false,
      facts: { title: null, metaDescription: null, canonical: null, robotsMeta: null, viewport: null, lang: null, h1Count: 0, imgTotal: 4, imgMissingAlt: 4, internalLinks: [] } },
    httpRedirect: { state: 'redirects_to_https' },
    robots: { state: 'missing', blocksAll: false, sitemaps: [] },
    sitemap: { state: 'missing' },
    links: null,
    pagespeed: { available: false, reason: 'The PageSpeed Insights daily quota was exceeded (HTTP 429).', fetchedAt: AT, strategy: 'mobile' },
    ...over,
  };
}

describe('buildFindings', () => {
  const findings = buildFindings(inputs());
  const byId = (id: string) => findings.find((f) => f.id === id)!;
  it('flags measured problems with evidence', () => {
    expect(byId('title').result).toBe('fail');
    expect(byId('meta_description').result).toBe('fail');
    expect(byId('viewport').result).toBe('fail');
    expect(byId('img_alt').evidence).toContain('4 of 4');
  });
  it('marks unavailable PageSpeed data as unavailable, with no invented score', () => {
    const f = byId('mobile_performance');
    expect(f.basis).toBe('unavailable');
    expect(f.result).toBe('info');
    expect(f.evidence).toContain('quota');
  });
  it('gives every finding the required fields', () => {
    for (const f of findings) {
      expect(f.evidence.length).toBeGreaterThan(5);
      expect(f.whyItMatters.length).toBeGreaterThan(5);
      expect(f.recommendation.length).toBeGreaterThan(3);
      expect(f.checkedAt).toBe(AT);
    }
  });
  it('does not turn unavailable data into opportunities', () => {
    const opps = deriveOpportunities(findings);
    const perf = opps.find((o) => o.service === 'performance');
    expect(perf).toBeUndefined();
    expect(opps.find((o) => o.service === 'seo')).toBeTruthy();
    expect(opps.every((o) => o.level === 'observed')).toBe(true);
  });
  it('reports an unreachable site as a single-attempt failure', () => {
    const f = buildFindings(inputs({ main: { ok: false, code: 'ENOTFOUND', message: 'Connection failed' } }));
    expect(f.find((x) => x.id === 'reachability')!.evidence).toContain('single attempt');
    expect(f.find((x) => x.id === 'title')).toBeUndefined();
  });
  it('produces a weight that ignores unavailable findings', () => {
    expect(issueWeight(findings)).toBeGreaterThan(0);
    expect(issueWeight(findings.filter((f) => f.basis === 'unavailable'))).toBe(0);
  });
});
