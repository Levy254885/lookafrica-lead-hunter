import type { IncomingHttpHeaders } from 'http';
import type { Finding, FindingResult, Severity } from '@/lib/types';

/**
 * In-house signal checks. Everything here is read from the response the audit already fetched
 * (headers and served HTML), so it needs no third-party service. Each finding states what was seen.
 * Facts that only appear after JavaScript runs are reported as absent from the served page.
 */
export interface SignalInput {
  checkedAt: string;
  finalUrl: string;
  headers: IncomingHttpHeaders;
  html: string;
  truncated: boolean;
}

interface Draft {
  id: string;
  check: string;
  result: FindingResult;
  severity: Severity;
  evidence: string;
  whyItMatters: string;
  recommendation: string;
  services?: string[];
}

const header = (h: IncomingHttpHeaders, name: string): string | null => {
  const v = h[name];
  return Array.isArray(v) ? v.join(', ') : typeof v === 'string' ? v : null;
};

/** Known platforms, matched on markers that appear in served HTML. Reported as "indicators", not certainty. */
const TECH: { name: string; re: RegExp }[] = [
  { name: 'WordPress', re: /wp-content\/|wp-includes\/|<meta[^>]+generator[^>]+wordpress/i },
  { name: 'Shopify', re: /cdn\.shopify\.com|Shopify\.theme/i },
  { name: 'Wix', re: /static\.wixstatic\.com|wix-code|<meta[^>]+generator[^>]+wix/i },
  { name: 'Squarespace', re: /squarespace\.com|static1\.squarespace/i },
  { name: 'Joomla', re: /<meta[^>]+generator[^>]+joomla/i },
  { name: 'Drupal', re: /<meta[^>]+generator[^>]+drupal|sites\/default\/files/i },
  { name: 'Next.js', re: /__NEXT_DATA__|\/_next\/static\//i },
  { name: 'Nuxt', re: /__NUXT__|\/_nuxt\//i },
  { name: 'React', re: /data-reactroot|react-dom/i },
  { name: 'Bootstrap', re: /bootstrap(\.min)?\.(css|js)/i },
  { name: 'jQuery', re: /jquery[.-][\d.]*(min\.)?js|jquery\.min\.js/i },
  { name: 'Google Tag Manager', re: /googletagmanager\.com\/gtm\.js/i },
  { name: 'Google Analytics', re: /google-analytics\.com|gtag\/js/i },
  { name: 'Meta Pixel', re: /connect\.facebook\.net\/[^"']*fbevents/i },
];

export function buildSignalFindings(i: SignalInput): Finding[] {
  const out: Finding[] = [];
  const add = (d: Draft) => out.push({ basis: 'measured', services: [], checkedAt: i.checkedAt, ...d });
  const https = i.finalUrl.startsWith('https://');
  const html = i.html;
  const head = (html.match(/<head[\s\S]*?<\/head>/i) ?? [''])[0];
  const stripped = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[\s\S]*?<\/script>/gi, '');

  // ---- Security headers -----------------------------------------------------------------
  const sec: [string, string, boolean][] = [
    ['strict-transport-security', 'Strict-Transport-Security (HSTS)', https],
    ['content-security-policy', 'Content-Security-Policy', true],
    ['x-content-type-options', 'X-Content-Type-Options', true],
    ['referrer-policy', 'Referrer-Policy', true],
  ];
  const missing = sec.filter(([k, , applies]) => applies && !header(i.headers, k)).map(([, label]) => label);
  const framing = header(i.headers, 'x-frame-options') || /frame-ancestors/i.test(header(i.headers, 'content-security-policy') ?? '');
  if (!framing) missing.push('clickjacking protection (X-Frame-Options or frame-ancestors)');
  add({
    id: 'security_headers',
    check: 'Security headers',
    result: missing.length === 0 ? 'pass' : missing.length >= 3 ? 'warn' : 'info',
    severity: missing.length >= 3 ? 'medium' : 'low',
    evidence: missing.length === 0 ? 'All of the common security headers were present in the response.' : `Not present in the response: ${missing.join('; ')}.`,
    whyItMatters: 'These headers tell browsers to refuse several common attacks such as framing and content sniffing.',
    recommendation: 'Add the missing headers at the web server or hosting layer. Test a content security policy before enforcing it.',
    services: missing.length >= 3 ? ['security'] : [],
  });

  // ---- Delivery: compression and caching ------------------------------------------------
  const enc = header(i.headers, 'content-encoding');
  add({
    id: 'compression',
    check: 'Text compression',
    result: enc ? 'pass' : 'warn',
    severity: 'low',
    evidence: enc ? `The page was served with content-encoding: ${enc}.` : 'The page was served without gzip or Brotli compression.',
    whyItMatters: 'Compression shrinks the page that visitors download, which helps on slower mobile connections.',
    recommendation: 'Enable gzip or Brotli on the web server or CDN.',
    services: enc ? [] : ['performance'],
  });
  const kb = Math.round(Buffer.byteLength(html, 'utf8') / 1024);
  add({
    id: 'html_weight',
    check: 'HTML size',
    result: kb > 500 ? 'warn' : 'pass',
    severity: 'low',
    evidence: `The served HTML was about ${kb} KB${i.truncated ? ' (the audit stopped reading at its size limit)' : ''}.`,
    whyItMatters: 'Very large HTML documents are slow to download and parse on phones.',
    recommendation: kb > 500 ? 'Reduce inline scripts, styles and repeated markup.' : 'No action needed.',
    services: kb > 500 ? ['performance'] : [],
  });
  const blocking = (head.match(/<script\b[^>]*\bsrc=[^>]*>/gi) ?? []).filter((t) => !/\b(async|defer|type=["']module["'])\b/i.test(t)).length;
  add({
    id: 'blocking_scripts',
    check: 'Render-blocking scripts',
    result: blocking > 3 ? 'warn' : 'pass',
    severity: 'low',
    evidence: `${blocking} external script${blocking === 1 ? '' : 's'} in the head without async or defer.`,
    whyItMatters: 'Scripts that block rendering delay the first paint.',
    recommendation: blocking > 3 ? 'Add defer or async to scripts that do not need to run first.' : 'No action needed.',
    services: blocking > 3 ? ['performance'] : [],
  });
  const mixed = https ? (stripped.match(/\s(?:src|href)=["']http:\/\/[^"']+/gi) ?? []).filter((m) => /src=/i.test(m)).length : 0;
  if (https) {
    add({
      id: 'mixed_content',
      check: 'Mixed content',
      result: mixed > 0 ? 'fail' : 'pass',
      severity: 'medium',
      evidence: mixed > 0 ? `${mixed} resource reference${mixed === 1 ? '' : 's'} in the HTML load over plain http.` : 'No http resource references were found in the served HTML.',
      whyItMatters: 'Browsers block or warn about insecure resources on secure pages.',
      recommendation: mixed > 0 ? 'Change those references to https.' : 'No action needed.',
      services: mixed > 0 ? ['security'] : [],
    });
  }

  // ---- Search and sharing ---------------------------------------------------------------
  const og = /<meta[^>]+property=["']og:(title|description|image)["']/i.test(head);
  add({
    id: 'open_graph',
    check: 'Social sharing tags',
    result: og ? 'pass' : 'info',
    severity: 'low',
    evidence: og ? 'Open Graph tags were found in the head.' : 'No Open Graph tags (og:title, og:description, og:image) were found in the served head.',
    whyItMatters: 'Without them, links shared on WhatsApp, Facebook and LinkedIn show a plain or empty preview.',
    recommendation: og ? 'No action needed.' : 'Add og:title, og:description and og:image to each page.',
    services: og ? [] : ['seo'],
  });
  const ld = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
  add({
    id: 'structured_data',
    check: 'Structured data',
    result: ld ? 'pass' : 'info',
    severity: 'low',
    evidence: ld ? 'JSON-LD structured data was found.' : 'No JSON-LD structured data was found in the served HTML.',
    whyItMatters: 'Structured data helps search engines show business details such as address, hours and reviews.',
    recommendation: ld ? 'No action needed.' : 'Add LocalBusiness or Organization markup with the real business details.',
    services: ld ? [] : ['seo'],
  });
  const levels = [...stripped.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
  let skipped = 0;
  for (let k = 1; k < levels.length; k++) if (levels[k] - levels[k - 1] > 1) skipped++;
  add({
    id: 'heading_order',
    check: 'Heading order',
    result: skipped > 0 ? 'warn' : levels.length ? 'pass' : 'info',
    severity: 'low',
    evidence: levels.length ? (skipped > 0 ? `${skipped} place${skipped === 1 ? '' : 's'} where a heading level is skipped (for example h2 followed by h4).` : `${levels.length} headings found, with no skipped levels.`) : 'No headings were found in the served HTML.',
    whyItMatters: 'A clear heading outline helps screen readers and search engines understand the page.',
    recommendation: skipped > 0 ? 'Use headings in order without skipping levels.' : 'No action needed.',
    services: skipped > 0 ? ['accessibility', 'seo'] : [],
  });
  add({
    id: 'favicon',
    check: 'Favicon',
    result: /<link[^>]+rel=["'][^"']*icon[^"']*["']/i.test(head) ? 'pass' : 'info',
    severity: 'info',
    evidence: /<link[^>]+rel=["'][^"']*icon/i.test(head) ? 'A favicon link was found.' : 'No favicon link was found in the head. A /favicon.ico file may still exist.',
    whyItMatters: 'A favicon makes the site recognisable in browser tabs and bookmarks.',
    recommendation: 'Add a favicon link to the head.',
  });

  // ---- Contact and conversion -----------------------------------------------------------
  const tel = /href=["']tel:/i.test(stripped);
  const mail = /href=["']mailto:/i.test(stripped);
  const wa = /href=["'][^"']*(wa\.me|api\.whatsapp\.com)/i.test(stripped);
  const forms = (stripped.match(/<form\b/gi) ?? []).length;
  add({
    id: 'contact_paths',
    check: 'Contact options on the page',
    result: tel || mail || wa || forms ? 'pass' : 'warn',
    severity: 'medium',
    evidence: `Click-to-call: ${tel ? 'yes' : 'no'}. Email link: ${mail ? 'yes' : 'no'}. WhatsApp link: ${wa ? 'yes' : 'no'}. Forms: ${forms}.`,
    whyItMatters: 'Visitors on phones expect to call, message or enquire in one tap.',
    recommendation: tel || mail || wa || forms ? 'No action needed.' : 'Add a visible phone link, WhatsApp link or enquiry form.',
    services: tel || mail || wa || forms ? [] : ['web_redesign', 'automation'],
  });

  // ---- Technology indicators ------------------------------------------------------------
  const found = TECH.filter((t) => t.re.test(html)).map((t) => t.name);
  add({
    id: 'tech_indicators',
    check: 'Technology indicators',
    result: 'info',
    severity: 'info',
    evidence: found.length ? `Markers in the served HTML suggest: ${found.join(', ')}. These are indicators, not a guarantee.` : 'No common platform markers were found in the served HTML.',
    whyItMatters: 'Knowing the platform shapes what work is realistic and how to approach the owner.',
    recommendation: 'Confirm with the site owner before proposing changes.',
  });

  return out;
}
