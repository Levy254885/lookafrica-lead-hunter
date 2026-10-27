import type { Finding, FindingBasis, FindingResult, OpportunityIndicator, Severity } from '@/lib/types';
import { SERVICE_LABEL } from '@/lib/types';
import type { HtmlFacts } from '@/lib/audit/html';
import type { PageSpeedResult } from '@/lib/audit/pagespeed';

export interface AuditInputs {
  checkedAt: string;
  main:
    | {
        ok: true;
        finalUrl: string;
        status: number;
        responseTimeMs: number;
        redirects: { url: string; status: number }[];
        facts: HtmlFacts | null;
        contentType: string | null;
        truncated: boolean;
      }
    | { ok: false; code: string; message: string };
  httpRedirect: { state: 'redirects_to_https' | 'stays_http' | 'unavailable'; detail?: string };
  robots: { state: 'found' | 'missing' | 'unavailable'; blocksAll: boolean; sitemaps: string[]; detail?: string };
  sitemap: { state: 'found' | 'missing' | 'unavailable'; url?: string };
  links: { checked: number; found: number; broken: { url: string; status: number | string }[] } | null;
  pagespeed: PageSpeedResult;
}

interface FindingInput {
  id: string;
  check: string;
  result: FindingResult;
  severity: Severity;
  evidence: string;
  whyItMatters: string;
  recommendation: string;
  basis?: FindingBasis;
  services?: string[];
}

export function buildFindings(i: AuditInputs): Finding[] {
  const out: Finding[] = [];
  const add = (f: FindingInput) =>
    out.push({
      basis: 'measured',
      services: [],
      checkedAt: i.checkedAt,
      ...f,
    });

  // ---- Reachability and HTTPS ------------------------------------------------------------
  if (!i.main.ok) {
    add({
      id: 'reachability',
      check: 'Site reachable',
      result: 'fail',
      severity: 'high',
      evidence: `The request failed with "${i.main.code}": ${i.main.message} This is a single attempt made at the audit time and may be temporary.`,
      whyItMatters: 'Visitors and search engines cannot use a site that does not load.',
      recommendation:
        'Confirm the address is correct, then check hosting, DNS and the TLS certificate. Re-run the audit to see whether the failure persists.',
      services: ['maintenance'],
    });
    addPageSpeedFindings(i, add);
    return out;
  }

  const main = i.main;
  const finalIsHttps = main.finalUrl.startsWith('https://');

  add({
    id: 'reachability',
    check: 'Site reachable',
    result: main.status >= 200 && main.status < 400 ? 'pass' : 'fail',
    severity: main.status >= 200 && main.status < 400 ? 'info' : 'high',
    evidence: `Final URL ${main.finalUrl} answered with HTTP ${main.status}.`,
    whyItMatters: 'A page that returns an error status is not served normally to visitors or crawlers.',
    recommendation:
      main.status >= 400
        ? 'Investigate why this address returns an error status and fix the underlying page or server configuration.'
        : 'No action needed.',
    services: ['maintenance'],
  });

  add({
    id: 'https',
    check: 'Served over HTTPS',
    result: finalIsHttps ? 'pass' : 'fail',
    severity: finalIsHttps ? 'info' : 'high',
    evidence: finalIsHttps
      ? 'The final address uses HTTPS and the TLS certificate was accepted.'
      : 'The final address uses plain HTTP.',
    whyItMatters: 'Browsers label plain HTTP sites as not secure, and HTTPS is a baseline expectation for any site that collects enquiries.',
    recommendation: finalIsHttps ? 'No action needed.' : 'Install a TLS certificate and serve every page over HTTPS.',
    services: ['security'],
  });

  if (finalIsHttps) {
    if (i.httpRedirect.state === 'unavailable') {
      add({
        id: 'http_to_https',
        check: 'HTTP redirects to HTTPS',
        result: 'info',
        severity: 'info',
        evidence: i.httpRedirect.detail ?? 'The HTTP version of the site could not be checked.',
        whyItMatters: 'Visitors who type the address without https should still reach the secure site.',
        recommendation: 'Re-run the audit; if it persists, test the http:// address manually.',
        basis: 'unavailable',
        services: ['security'],
      });
    } else {
      const ok = i.httpRedirect.state === 'redirects_to_https';
      add({
        id: 'http_to_https',
        check: 'HTTP redirects to HTTPS',
        result: ok ? 'pass' : 'warn',
        severity: ok ? 'info' : 'medium',
        evidence: ok
          ? 'Requesting the http:// address redirected to https://.'
          : 'Requesting the http:// address returned a page over plain HTTP without redirecting.',
        whyItMatters: 'Without a redirect, some visitors and old links land on an insecure copy of the site.',
        recommendation: ok ? 'No action needed.' : 'Add a permanent (301) redirect from HTTP to HTTPS at the server or CDN.',
        services: ['security'],
      });
    }
  }

  const hops = main.redirects.length;
  add({
    id: 'redirect_chain',
    check: 'Redirect chain length',
    result: hops >= 3 ? 'warn' : 'pass',
    severity: hops >= 3 ? 'low' : 'info',
    evidence:
      hops === 0
        ? 'No redirects were followed.'
        : `${hops} redirect${hops === 1 ? '' : 's'} followed: ${main.redirects.map((r) => `${r.status} ${r.url}`).join(' -> ')} -> ${main.finalUrl}`,
    whyItMatters: 'Long redirect chains slow the first load and can dilute search signals.',
    recommendation: hops >= 3 ? 'Point the original address directly at the final destination.' : 'No action needed.',
    services: ['seo', 'performance'],
  });

  add({
    id: 'response_time',
    check: 'Server response time (single measurement)',
    result: main.responseTimeMs > 3000 ? 'warn' : 'info',
    severity: main.responseTimeMs > 3000 ? 'low' : 'info',
    evidence: `The page and any redirects completed in ${main.responseTimeMs} ms from our server. One measurement is indicative only and varies with network conditions.`,
    whyItMatters: 'Slow server responses delay everything else on the page.',
    recommendation:
      main.responseTimeMs > 3000
        ? 'Review hosting, caching and server-side processing time, then confirm with the PageSpeed results below.'
        : 'No action needed.',
    services: ['performance'],
  });

  // ---- On-page SEO and accessibility facts ----------------------------------------------
  const facts = main.facts;
  if (!facts) {
    add({
      id: 'html_analysis',
      check: 'HTML page analysis',
      result: 'info',
      severity: 'info',
      evidence: `The response content type was "${main.contentType ?? 'unknown'}", so on-page checks were skipped.`,
      whyItMatters: 'On-page checks only apply to HTML documents.',
      recommendation: 'Audit a page that serves HTML.',
      basis: 'unavailable',
    });
  } else {
    const t = facts.title;
    add({
      id: 'title',
      check: 'Page title',
      result: !t ? 'fail' : t.length < 10 || t.length > 60 ? 'warn' : 'pass',
      severity: !t ? 'medium' : t.length < 10 || t.length > 60 ? 'low' : 'info',
      evidence: t ? `Title is ${t.length} characters: "${t.slice(0, 120)}"` : 'No <title> element was found in the served HTML.',
      whyItMatters: 'The title is the main headline shown in search results and browser tabs.',
      recommendation: !t
        ? 'Add a unique, descriptive title of roughly 10 to 60 characters.'
        : t.length < 10 || t.length > 60
          ? 'Aim for a descriptive title of roughly 10 to 60 characters so it is not cut off.'
          : 'No action needed.',
      services: ['seo'],
    });

    const d = facts.metaDescription;
    add({
      id: 'meta_description',
      check: 'Meta description',
      result: !d ? 'fail' : d.length < 50 || d.length > 160 ? 'warn' : 'pass',
      severity: !d ? 'medium' : d.length < 50 || d.length > 160 ? 'low' : 'info',
      evidence: d ? `Meta description is ${d.length} characters.` : 'No meta description was found in the served HTML.',
      whyItMatters: 'Search engines often use it as the snippet under the title, which affects click-through.',
      recommendation: !d
        ? 'Add a meta description of roughly 50 to 160 characters that summarizes the page.'
        : d.length < 50 || d.length > 160
          ? 'Adjust the description to roughly 50 to 160 characters.'
          : 'No action needed.',
      services: ['seo'],
    });

    let canonicalOtherHost = false;
    if (facts.canonical) {
      try {
        canonicalOtherHost =
          new URL(facts.canonical, main.finalUrl).hostname.replace(/^www\./, '') !==
          new URL(main.finalUrl).hostname.replace(/^www\./, '');
      } catch {
        canonicalOtherHost = false;
      }
    }
    add({
      id: 'canonical',
      check: 'Canonical URL',
      result: !facts.canonical ? 'warn' : canonicalOtherHost ? 'warn' : 'pass',
      severity: !facts.canonical ? 'low' : canonicalOtherHost ? 'medium' : 'info',
      evidence: facts.canonical
        ? `Canonical URL declared: ${facts.canonical}${canonicalOtherHost ? ' (points to a different domain).' : ''}`
        : 'No canonical link was found in the served HTML.',
      whyItMatters: 'A canonical tag tells search engines which address is the preferred version of a page.',
      recommendation: !facts.canonical
        ? 'Add a rel="canonical" link pointing to the preferred address of each page.'
        : canonicalOtherHost
          ? 'Confirm the canonical pointing to another domain is intentional.'
          : 'No action needed.',
      services: ['seo'],
    });

    const noindex = /noindex/i.test(facts.robotsMeta ?? '');
    add({
      id: 'robots_meta',
      check: 'Robots meta directive',
      result: noindex ? 'fail' : 'pass',
      severity: noindex ? 'high' : 'info',
      evidence: facts.robotsMeta
        ? `Robots meta content: "${facts.robotsMeta}".`
        : 'No robots meta tag found, so default indexing behaviour applies.',
      whyItMatters: 'A noindex directive asks search engines to leave the page out of results. This may be intentional.',
      recommendation: noindex
        ? 'Confirm noindex is intended. If not, remove it so the page can appear in search.'
        : 'No action needed.',
      services: ['seo'],
    });

    add({
      id: 'viewport',
      check: 'Mobile viewport tag',
      result: facts.viewport ? 'pass' : 'fail',
      severity: facts.viewport ? 'info' : 'medium',
      evidence: facts.viewport ? `Viewport meta: "${facts.viewport}".` : 'No viewport meta tag was found in the served HTML.',
      whyItMatters: 'Without it, phones typically render the page at desktop width and shrink it.',
      recommendation: facts.viewport ? 'No action needed.' : 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> and verify the layout on a phone.',
      services: ['web_redesign'],
    });

    add({
      id: 'img_alt',
      check: 'Image alternative text',
      result: facts.imgMissingAlt === 0 ? 'pass' : facts.imgMissingAlt / Math.max(facts.imgTotal, 1) > 0.5 ? 'fail' : 'warn',
      severity: facts.imgMissingAlt === 0 ? 'info' : facts.imgMissingAlt / Math.max(facts.imgTotal, 1) > 0.5 ? 'medium' : 'low',
      evidence: `${facts.imgMissingAlt} of ${facts.imgTotal} <img> elements in the served HTML of this page have no alt attribute. Only this page was checked.`,
      whyItMatters: 'Alt text lets screen reader users and search engines understand images. Decorative images should use an empty alt.',
      recommendation: facts.imgMissingAlt === 0 ? 'No action needed.' : 'Add descriptive alt text to meaningful images and alt="" to decorative ones.',
      services: ['accessibility', 'seo'],
    });

    add({
      id: 'h1',
      check: 'Primary heading (h1)',
      result: facts.h1Count === 0 ? 'warn' : 'pass',
      severity: facts.h1Count === 0 ? 'low' : 'info',
      evidence: `${facts.h1Count} <h1> element${facts.h1Count === 1 ? '' : 's'} in the served HTML.`,
      whyItMatters: 'A clear main heading helps users, assistive technology and search engines understand the page.',
      recommendation: facts.h1Count === 0 ? 'Add one descriptive h1 to the page.' : 'No action needed.',
      services: ['seo', 'accessibility'],
    });

    add({
      id: 'lang',
      check: 'Document language',
      result: facts.lang ? 'pass' : 'warn',
      severity: facts.lang ? 'info' : 'low',
      evidence: facts.lang ? `The html element declares lang="${facts.lang}".` : 'The html element has no lang attribute.',
      whyItMatters: 'Screen readers use the language attribute to choose pronunciation.',
      recommendation: facts.lang ? 'No action needed.' : 'Add a lang attribute such as lang="en" to the html element.',
      services: ['accessibility'],
    });
  }

  // ---- robots.txt and sitemap -------------------------------------------------------------
  if (i.robots.state === 'unavailable') {
    add({
      id: 'robots_txt',
      check: 'robots.txt',
      result: 'info',
      severity: 'info',
      evidence: i.robots.detail ?? 'robots.txt could not be fetched.',
      whyItMatters: 'robots.txt tells crawlers which areas may be crawled.',
      recommendation: 'Re-run the audit or check /robots.txt manually.',
      basis: 'unavailable',
    });
  } else {
    const missing = i.robots.state === 'missing';
    add({
      id: 'robots_txt',
      check: 'robots.txt',
      result: i.robots.blocksAll ? 'fail' : missing ? 'warn' : 'pass',
      severity: i.robots.blocksAll ? 'high' : missing ? 'low' : 'info',
      evidence: missing
        ? 'No robots.txt was found at the site root.'
        : i.robots.blocksAll
          ? 'robots.txt contains "Disallow: /" for all user agents, which blocks crawling of the whole site. This may be intentional on a staging site.'
          : 'robots.txt is present and does not block the whole site.',
      whyItMatters: 'A missing file is usually harmless, but a blanket disallow keeps the site out of search results.',
      recommendation: i.robots.blocksAll
        ? 'Confirm the blanket disallow is intended; remove it on a live site.'
        : missing
          ? 'Add a robots.txt that references your sitemap.'
          : 'No action needed.',
      services: ['seo'],
    });
  }

  if (i.sitemap.state === 'unavailable') {
    add({
      id: 'sitemap',
      check: 'XML sitemap',
      result: 'info',
      severity: 'info',
      evidence: 'The sitemap location could not be checked.',
      whyItMatters: 'Sitemaps help search engines discover pages.',
      recommendation: 'Re-run the audit or check /sitemap.xml manually.',
      basis: 'unavailable',
    });
  } else {
    const found = i.sitemap.state === 'found';
    add({
      id: 'sitemap',
      check: 'XML sitemap',
      result: found ? 'pass' : 'warn',
      severity: found ? 'info' : 'low',
      evidence: found
        ? `A sitemap was found at ${i.sitemap.url}.`
        : 'No sitemap was found in robots.txt or at /sitemap.xml. Other locations were not checked.',
      whyItMatters: 'Sitemaps help search engines discover and re-crawl pages.',
      recommendation: found ? 'No action needed.' : 'Publish an XML sitemap and reference it in robots.txt.',
      services: ['seo'],
    });
  }

  // ---- Internal links -----------------------------------------------------------------------
  if (i.links && i.links.found > 0) {
    const broken = i.links.broken;
    add({
      id: 'broken_links',
      check: 'Broken internal links (sample)',
      result: broken.length === 0 ? 'pass' : 'fail',
      severity: broken.length === 0 ? 'info' : 'medium',
      evidence:
        broken.length === 0
          ? `Checked ${i.links.checked} of ${i.links.found} internal links found on this page; none returned an error.`
          : `Checked ${i.links.checked} of ${i.links.found} internal links on this page; ${broken.length} failed: ${broken
              .slice(0, 5)
              .map((b) => `${b.url} (${b.status})`)
              .join(', ')}.`,
      whyItMatters: 'Broken links frustrate visitors and waste crawl budget.',
      recommendation: broken.length === 0 ? 'No action needed.' : 'Fix or redirect the failing links. Confirm each manually; this is a one-time sample.',
      services: ['maintenance', 'seo'],
    });
  }

  addPageSpeedFindings(i, add);
  return out;
}

function addPageSpeedFindings(i: AuditInputs, add: (f: FindingInput) => void): void {
  const ps = i.pagespeed;
  if (!ps.available || !ps.scores) {
    add({
      id: 'mobile_performance',
      check: 'Mobile performance (PageSpeed Insights)',
      result: 'info',
      severity: 'info',
      evidence: ps.reason ?? 'PageSpeed Insights data is unavailable.',
      whyItMatters: 'Mobile speed strongly affects visitor experience and search visibility.',
      recommendation: 'Re-run the audit later, or run PageSpeed Insights manually for this address.',
      basis: 'unavailable',
      services: ['performance'],
    });
    return;
  }
  const perf = ps.scores.performance;
  if (perf === null) {
    add({
      id: 'mobile_performance',
      check: 'Mobile performance (PageSpeed Insights)',
      result: 'info',
      severity: 'info',
      evidence: 'PageSpeed Insights returned no performance score for this page.',
      whyItMatters: 'Mobile speed strongly affects visitor experience.',
      recommendation: 'Run PageSpeed Insights manually to investigate.',
      basis: 'unavailable',
      services: ['performance'],
    });
  } else {
    const lab = ps.lab;
    add({
      id: 'mobile_performance',
      check: 'Mobile performance (PageSpeed Insights)',
      result: perf < 50 ? 'fail' : perf < 90 ? 'warn' : 'pass',
      severity: perf < 50 ? 'high' : perf < 90 ? 'medium' : 'info',
      evidence: `Lighthouse mobile performance score ${perf}/100 as reported by Google PageSpeed Insights${
        lab?.lcpMs != null ? `; lab LCP ${(lab.lcpMs / 1000).toFixed(1)} s` : ''
      }${lab?.tbtMs != null ? `; lab TBT ${Math.round(lab.tbtMs)} ms` : ''}. Lab scores vary between runs.`,
      whyItMatters: 'Slow mobile pages lose visitors and can rank lower in search.',
      recommendation:
        perf >= 90
          ? 'No action needed.'
          : 'Review the PageSpeed report for the largest opportunities, typically image sizes, render-blocking resources and unused JavaScript.',
      services: ['performance'],
    });
  }

  const f = ps.field;
  if (!f || (!f.lcp && !f.cls && !f.inp)) {
    add({
      id: 'core_web_vitals',
      check: 'Core Web Vitals (real-user data)',
      result: 'info',
      severity: 'info',
      evidence: 'Google has no real-user (CrUX) data for this page or origin, usually because of low traffic.',
      whyItMatters: 'Core Web Vitals from real users are the signal Google uses for page experience.',
      recommendation: 'Rely on the lab results above; real-user data appears once the site has enough traffic.',
      basis: 'unavailable',
      services: ['performance'],
    });
  } else {
    const cats = [f.lcp, f.cls, f.inp].filter(Boolean).map((m) => m!.category);
    const poor = cats.some((c) => c === 'SLOW');
    const mid = cats.some((c) => c === 'AVERAGE');
    add({
      id: 'core_web_vitals',
      check: 'Core Web Vitals (real-user data)',
      result: poor ? 'fail' : mid ? 'warn' : 'pass',
      severity: poor ? 'high' : mid ? 'medium' : 'info',
      evidence: `Real-user data (${f.scope === 'origin' ? 'origin-wide' : 'this URL'}): ${[
        f.lcp ? `LCP ${(f.lcp.percentile / 1000).toFixed(1)} s (${f.lcp.category.toLowerCase()})` : null,
        f.cls ? `CLS ${(f.cls.percentile / 100).toFixed(2)} (${f.cls.category.toLowerCase()})` : null,
        f.inp ? `INP ${f.inp.percentile} ms (${f.inp.category.toLowerCase()})` : null,
      ]
        .filter(Boolean)
        .join(', ')}.`,
      whyItMatters: 'These metrics reflect what actual visitors experienced.',
      recommendation: poor || mid ? 'Prioritize the metric rated slow or average in the PageSpeed report.' : 'No action needed.',
      services: ['performance'],
    });
  }

  const a11y = ps.scores.accessibility;
  if (a11y !== null) {
    add({
      id: 'accessibility_score',
      check: 'Accessibility (Lighthouse automated checks)',
      result: a11y < 70 ? 'fail' : a11y < 90 ? 'warn' : 'pass',
      severity: a11y < 70 ? 'medium' : a11y < 90 ? 'low' : 'info',
      evidence: `Lighthouse accessibility score ${a11y}/100. Automated checks catch only a portion of accessibility issues.`,
      whyItMatters: 'Accessible sites reach more visitors and reduce legal and reputational risk.',
      recommendation: a11y >= 90 ? 'No action needed; manual testing is still advised.' : 'Work through the accessibility items in the PageSpeed report.',
      services: ['accessibility'],
    });
  }

  const seo = ps.scores.seo;
  if (seo !== null) {
    add({
      id: 'seo_score',
      check: 'SEO basics (Lighthouse automated checks)',
      result: seo < 80 ? 'warn' : 'pass',
      severity: seo < 80 ? 'low' : 'info',
      evidence: `Lighthouse SEO score ${seo}/100. This covers basic technical checks only, not rankings or content quality.`,
      whyItMatters: 'Basic technical SEO issues can limit how well pages are discovered and displayed.',
      recommendation: seo >= 80 ? 'No action needed.' : 'Review the SEO items in the PageSpeed report.',
      services: ['seo'],
    });
  }
}

// ---- Derived data ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<Severity, number> = { high: 3, medium: 2, low: 1, info: 0 };

/**
 * Groups measured problems by the service they relate to. Only findings that were actually measured
 * and are warn or fail become opportunity indicators; unavailable data never does.
 */
export function deriveOpportunities(findings: Finding[]): OpportunityIndicator[] {
  const byService = new Map<string, Finding[]>();
  for (const f of findings) {
    if (f.basis !== 'measured' || (f.result !== 'fail' && f.result !== 'warn')) continue;
    for (const s of f.services) {
      const list = byService.get(s) ?? [];
      list.push(f);
      byService.set(s, list);
    }
  }
  const out: OpportunityIndicator[] = [];
  for (const [service, list] of byService) {
    const sorted = [...list].sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]);
    out.push({
      service,
      reason: `${sorted.length} measured finding${sorted.length === 1 ? '' : 's'} relevant to ${SERVICE_LABEL[service] ?? service}: ${sorted
        .slice(0, 3)
        .map((f) => f.check)
        .join('; ')}.`,
      findingIds: sorted.map((f) => f.id),
      level: 'observed',
    });
  }
  return out.sort((a, b) => b.findingIds.length - a.findingIds.length);
}

export const SEVERITY_WEIGHT: Record<Severity, number> = { high: 12, medium: 6, low: 2, info: 0 };

/** Sum of severity weights for measured warn/fail findings. Used by lead scoring. */
export function issueWeight(findings: Finding[]): number {
  return findings
    .filter((f) => f.basis === 'measured' && (f.result === 'fail' || f.result === 'warn'))
    .reduce((sum, f) => sum + SEVERITY_WEIGHT[f.severity], 0);
}

export function summarize(findings: Finding[]) {
  const count = (r: FindingResult) => findings.filter((f) => f.result === r).length;
  return {
    total: findings.length,
    pass: count('pass'),
    warn: count('warn'),
    fail: count('fail'),
    info: count('info'),
    unavailable: findings.filter((f) => f.basis === 'unavailable').length,
  };
}
