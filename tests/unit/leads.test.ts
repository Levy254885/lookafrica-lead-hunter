import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from '@/lib/csv';
import { buildOverpassQuery, elementToCandidate, sanitizeAreaName } from '@/lib/leads/adapters/osm';
import { dedupeKey, domainOf, leadDocId, normalizeEmail, normalizeName, normalizePhone, normalizeWebsite } from '@/lib/leads/normalize';
import { parseRemotive } from '@/lib/projects/remotive';
import { aiConfigured, buildFactSheet, extractDraft, OPT_OUT_LINE, templateDraft, type DraftContext } from '@/lib/proposals/generate';

describe('normalization', () => {
  it('normalizes names for matching', () => {
    expect(normalizeName('Café  Java & Co. Ltd')).toBe(normalizeName('cafe java and'));
  });
  it('cleans websites and rejects internal ones', () => {
    expect(normalizeWebsite('https://www.Example.com/?utm_source=x#top')).toBe('https://www.example.com');
    expect(normalizeWebsite('http://localhost:3000')).toBeNull();
    expect(normalizeWebsite('javascript:alert(1)')).toBeNull();
    expect(normalizeWebsite(null)).toBeNull();
  });
  it('validates phone and email', () => {
    expect(normalizePhone('+254 712 345 678')).toBe('+254712345678');
    expect(normalizePhone('12')).toBeNull();
    expect(normalizeEmail(' Info@Shop.CO.KE ')).toBe('info@shop.co.ke');
    expect(normalizeEmail('not an email')).toBeNull();
  });
  it('detects duplicates by domain first, then by name and city', () => {
    const a = dedupeKey({ name: 'Acme Ltd', city: 'Nairobi', website: 'https://www.acme.co.ke/' });
    const b = dedupeKey({ name: 'ACME Limited Nairobi', city: 'Nairobi', website: 'https://acme.co.ke' });
    expect(a).toBe(b);
    expect(dedupeKey({ name: 'Acme', city: 'Nairobi', website: null })).not.toBe(dedupeKey({ name: 'Acme', city: 'Mombasa', website: null }));
    expect(domainOf('https://www.acme.co.ke/x')).toBe('acme.co.ke');
  });
  it('makes lead ids deterministic per owner', () => {
    expect(leadDocId('u1', 'd:acme.co.ke')).toBe(leadDocId('u1', 'd:acme.co.ke'));
    expect(leadDocId('u1', 'd:acme.co.ke')).not.toBe(leadDocId('u2', 'd:acme.co.ke'));
  });
});

describe('CSV export', () => {
  it('neutralizes spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });
  it('quotes commas, quotes and newlines and joins arrays', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell(['x', 'y'])).toBe('x; y');
    expect(csvCell(null)).toBe('');
    expect(toCsv(['A'], [['x']])).toContain('A\r\nx');
  });
});

describe('OpenStreetMap adapter', () => {
  it('builds a bounded query for supported inputs', () => {
    const q = buildOverpassQuery({ country: 'KE', city: 'Nairobi', category: 'food', websiteStatus: 'any', limit: 50 });
    expect(q).toContain('"ISO3166-1"="KE"');
    expect(q).toContain('out tags center 50;');
    expect(q).toContain('[timeout:25]');
  });
  it('rejects query injection through the city name', () => {
    expect(() => sanitizeAreaName('Nairobi"; out;')).toThrow();
    expect(() => buildOverpassQuery({ country: 'KE', city: 'x"];node(1);out;//', category: 'food', websiteStatus: 'any', limit: 10 })).toThrow();
  });
  it('rejects unsupported country and category', () => {
    expect(() => buildOverpassQuery({ country: 'XX', city: 'Nairobi', category: 'food', websiteStatus: 'any', limit: 10 })).toThrow();
    expect(() => buildOverpassQuery({ country: 'KE', city: 'Nairobi', category: 'nope', websiteStatus: 'any', limit: 10 })).toThrow();
  });
  it('maps an element with provenance and never invents missing fields', () => {
    const c = elementToCandidate(
      { type: 'node', id: 42, lat: -1.28, lon: 36.82, tags: { name: 'Mama Shop', shop: 'convenience', phone: '+254 700 111 222', check_date: '2026-03-01' } },
      { country: 'KE', city: 'Nairobi', category: 'retail', retrievedAt: '2026-10-25T00:00:00.000Z' },
    )!;
    expect(c.provenance.sourceUrl).toBe('https://www.openstreetmap.org/node/42');
    expect(c.provenance.attribution).toContain('OpenStreetMap contributors');
    expect(c.provenance.lastVerifiedAt).toBe('2026-03-01T00:00:00.000Z');
    expect(c.website).toBeNull();
    expect(c.email).toBeNull();
    expect(c.phone).toBe('+254700111222');
  });
  it('skips unnamed elements', () => {
    expect(elementToCandidate({ type: 'node', id: 1, tags: { shop: 'x' } }, { country: 'KE', city: 'N', category: 'retail', retrievedAt: '' })).toBeNull();
  });
});

describe('Remotive parsing', () => {
  it('keeps only valid listings that link to remotive.com', () => {
    const out = parseRemotive({ jobs: [
      { id: 1, title: 'Web developer', url: 'https://remotive.com/remote-jobs/software-dev/web-1', company_name: 'Acme', publication_date: '2026-10-20T10:00:00', tags: ['react'], candidate_required_location: 'Worldwide' },
      { id: 2, title: 'Phishing', url: 'https://evil.example/x' },
      { id: 3, title: '', url: 'https://remotive.com/x' },
    ] });
    expect(out).toHaveLength(1);
    expect(out[0].deadline).toBeNull();
    expect(out[0].skills).toEqual(['react']);
    expect(parseRemotive(null)).toEqual([]);
  });
});

describe('proposal drafting', () => {
  const ctx: DraftContext = {
    lead: { name: 'Mama Shop', categoryLabel: 'Convenience', city: 'Nairobi', website: 'https://mama.example', sourceLabel: 'OpenStreetMap' },
    findings: [],
    auditDate: null,
    service: 'seo',
    senderName: 'Jane',
    tone: 'professional',
  };
  it('makes no claims about the website when there are no findings', () => {
    const d = templateDraft(ctx);
    expect(d.body).toContain("won't guess");
    expect(d.body).not.toMatch(/broken|slow|insecure|missing|problem/i);
    expect(d.body).toContain(OPT_OUT_LINE);
    expect(buildFactSheet(ctx)).toContain('Make NO claims');
  });
  it('quotes only supplied findings and discloses the automated, single-page scope', () => {
    const d = templateDraft({ ...ctx, auditDate: '2026-10-20T00:00:00.000Z', findings: [{ id: 'title', check: 'Page title', evidence: 'No <title> element was found in the served HTML.', recommendation: 'Add one', severity: 'medium' }] });
    expect(d.body).toContain('No <title> element was found');
    expect(d.body).toContain('automated check of one page');
    expect(d.body).toContain('2026-10-20');
  });
  it('never fabricates a personal connection', () => {
    const d = templateDraft(ctx);
    expect(d.body).not.toMatch(/saw you|met you|mutual|recommended by|loved your|noticed you/i);
  });
  it('validates AI output and rejects placeholders', () => {
    expect(extractDraft('nope')).toBeNull();
    expect(extractDraft('{"subject":"Hello there","body":"Dear [Name], ' + 'x'.repeat(100) + '"}')).toBeNull();
    const good = extractDraft('Here: {"subject":"Hello there","body":"' + 'Useful and honest text. '.repeat(6) + '"}');
    expect(good?.subject).toBe('Hello there');
  });
  it('reports AI as unconfigured without a key', () => {
    const k = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    expect(aiConfigured()).toBe(false);
    if (k) process.env.ANTHROPIC_API_KEY = k;
  });
});
