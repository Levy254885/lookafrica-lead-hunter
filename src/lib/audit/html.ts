/**
 * Lightweight, dependency-free HTML fact extraction for audits.
 * It reads facts from the raw HTML the server returned. It does not execute JavaScript, so facts
 * that only exist after client-side rendering are reported as absent from the served HTML.
 */

export interface HtmlFacts {
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robotsMeta: string | null;
  viewport: string | null;
  lang: string | null;
  h1Count: number;
  imgTotal: number;
  imgMissingAlt: number;
  internalLinks: string[];
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ');
}

function getAttr(tag: string, name: string): string | null {
  const re = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i');
  const m = tag.match(re);
  if (!m) return null;
  return decodeEntities((m[1] ?? m[2] ?? m[3] ?? '').trim());
}

function hasAttr(tag: string, name: string): boolean {
  return new RegExp(`\\s${name}(?:\\s*=|\\s|/|>)`, 'i').test(tag);
}

function metaByName(html: string, name: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    if ((getAttr(tag, 'name') ?? '').toLowerCase() === name) return getAttr(tag, 'content');
  }
  return null;
}

export function analyzeHtml(html: string, baseUrl: string): HtmlFacts {
  // Remove comments, scripts and styles so their contents are not mistaken for markup.
  const clean = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '');

  const titleMatch = clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1]).replace(/\s+/g, ' ').trim() || null : null;

  let canonical: string | null = null;
  for (const tag of clean.match(/<link\b[^>]*>/gi) ?? []) {
    if ((getAttr(tag, 'rel') ?? '').toLowerCase().split(/\s+/).includes('canonical')) {
      canonical = getAttr(tag, 'href');
      break;
    }
  }

  const htmlTag = clean.match(/<html\b[^>]*>/i)?.[0] ?? '';
  const imgs = clean.match(/<img\b[^>]*>/gi) ?? [];
  const imgMissingAlt = imgs.filter((t) => !hasAttr(t, 'alt')).length;
  const h1Count = (clean.match(/<h1\b/gi) ?? []).length;

  let base: URL | null = null;
  try {
    base = new URL(baseUrl);
  } catch {
    base = null;
  }
  const links = new Set<string>();
  if (base) {
    for (const tag of clean.match(/<a\b[^>]*>/gi) ?? []) {
      const href = getAttr(tag, 'href');
      if (!href || href.startsWith('#') || /^(mailto|tel|javascript|sms|whatsapp):/i.test(href)) continue;
      try {
        const u = new URL(href, base);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
        if (u.hostname.replace(/^www\./, '') !== base.hostname.replace(/^www\./, '')) continue;
        u.hash = '';
        links.add(u.toString());
      } catch {
        // ignore malformed links
      }
      if (links.size >= 50) break;
    }
  }

  return {
    title,
    metaDescription: metaByName(clean, 'description'),
    canonical,
    robotsMeta: metaByName(clean, 'robots'),
    viewport: metaByName(clean, 'viewport'),
    lang: getAttr(htmlTag, 'lang'),
    h1Count,
    imgTotal: imgs.length,
    imgMissingAlt,
    internalLinks: [...links],
  };
}

/** Extracts Sitemap directives and detects a blanket "Disallow: /" for all crawlers. */
export function analyzeRobotsTxt(text: string): { sitemaps: string[]; blocksAll: boolean } {
  const sitemaps: string[] = [];
  let blocksAll = false;
  let appliesToAll = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (field === 'sitemap' && value) sitemaps.push(value);
    else if (field === 'user-agent') appliesToAll = value === '*';
    else if (field === 'disallow' && appliesToAll && value === '/') blocksAll = true;
  }
  return { sitemaps: sitemaps.slice(0, 5), blocksAll };
}
