import { createHash } from 'node:crypto';
import { validatePublicUrl } from '@/lib/audit/ssrf';

/** Normalization and duplicate detection helpers. Pure functions. */

const LEGAL_SUFFIXES = /\b(ltd|limited|plc|inc|llc|co|company)\b\.?/g;

export function normalizeName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(LEGAL_SUFFIXES, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Returns a clean http(s) URL or null. Private and internal hosts are rejected. */
export function normalizeWebsite(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const first = raw.trim().split(/[;,\s]/)[0];
  if (!first) return null;
  const check = validatePublicUrl(first);
  if (!check.ok) return null;
  const u = check.url;
  u.hash = '';
  // Drop common tracking parameters so the same site compares equal.
  for (const key of [...u.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid)/i.test(key)) u.searchParams.delete(key);
  }
  return u.toString().replace(/\/$/, '');
}

export function domainOf(website: string | null): string | null {
  if (!website) return null;
  try {
    return new URL(website).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const first = raw.split(/[;,]/)[0] ?? '';
  const cleaned = first.replace(/[^\d+]/g, '');
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  return cleaned.startsWith('+') ? `+${digits}` : digits;
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const first = (raw.trim().split(/[;,\s]/)[0] ?? '').toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(first) && first.length <= 254 ? first : null;
}

/**
 * Stable duplicate key. A shared website domain identifies the same business; otherwise the
 * normalized name and city do. This is deliberately conservative: it may miss some duplicates but
 * will not merge unrelated businesses that merely share a name in different cities.
 */
export function dedupeKey(c: { name: string; city: string; website: string | null }): string {
  const domain = domainOf(c.website);
  if (domain) return `d:${domain}`;
  return `n:${normalizeName(c.name)}|${normalizeName(c.city)}`;
}

/** Deterministic lead document id for an owner and duplicate key, so concurrent saves collide. */
export function leadDocId(ownerId: string, key: string): string {
  return createHash('sha256').update(`${ownerId}:${key}`).digest('hex').slice(0, 32);
}

export function recordDocId(source: string, sourceId: string): string {
  return `${source}__${sourceId.replace(/[^A-Za-z0-9_-]/g, '_')}`.slice(0, 200);
}
