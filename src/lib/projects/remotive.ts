import type { SourceStatus } from '@/lib/leads/adapters/types';

/**
 * Remotive remote-jobs API (software development category).
 *
 * This adapter is OFF until an operator sets REMOTIVE_TERMS_CONFIRMED=true after reading Remotive's
 * current API terms and confirming this use is allowed. Only listing metadata is stored (title,
 * company name as reported, category, tags, dates, location) with a link to the original listing.
 * Descriptions, salaries and logos are never stored. These are job and contract listings from a
 * third-party board, not leads from local Kenyan businesses.
 */

export interface ProjectCandidate {
  title: string;
  organization: string | null;
  source: 'remotive';
  sourceId: string;
  url: string;
  publishedAt: string | null;
  deadline: null;
  category: string;
  location: string | null;
  remote: boolean;
  skills: string[];
  employmentType: string | null;
}

const ENDPOINT = 'https://remotive.com/api/remote-jobs?category=software-dev&limit=100';

export function remotiveEnabled(): boolean {
  return process.env.REMOTIVE_TERMS_CONFIRMED === 'true';
}

export function remotiveStatus(): SourceStatus {
  const enabled = remotiveEnabled();
  return {
    id: 'remotive',
    label: 'Remotive remote jobs API',
    kind: 'projects',
    available: enabled,
    reason: enabled
      ? undefined
      : 'Disabled. Read the Remotive API terms, then set REMOTIVE_TERMS_CONFIRMED=true to enable (see docs/DATA_SOURCES.md).',
    endpoint: ENDPOINT,
    auth: 'None.',
    quota: 'The provider asks consumers to poll sparingly. This app fetches at most once every 6 hours.',
    cost: 'Free.',
    attribution: 'Each listing links to its original page on Remotive. Show the source name with every listing.',
    reuse: 'Metadata only, with a link back. Descriptions and salaries are not stored. Operator must confirm terms.',
    refresh: 'Scheduled every 6 hours; listings missing from the latest fetch are marked as such.',
    docsUrl: 'https://github.com/remotive-com/remote-jobs-api',
  };
}

function isRemotiveUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && (u.hostname === 'remotive.com' || u.hostname.endsWith('.remotive.com'));
  } catch {
    return false;
  }
}

function parseDate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = Date.parse(raw.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw}Z`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export function parseRemotive(json: unknown): ProjectCandidate[] {
  const jobs = (json as { jobs?: unknown[] } | null)?.jobs;
  if (!Array.isArray(jobs)) return [];
  const out: ProjectCandidate[] = [];
  for (const j of jobs as Record<string, unknown>[]) {
    const id = j.id;
    const title = typeof j.title === 'string' ? j.title.trim() : '';
    const url = typeof j.url === 'string' ? j.url : '';
    if ((typeof id !== 'number' && typeof id !== 'string') || !title || !isRemotiveUrl(url)) continue;
    const location = typeof j.candidate_required_location === 'string' ? j.candidate_required_location.trim() : '';
    out.push({
      title: title.slice(0, 160),
      organization: typeof j.company_name === 'string' && j.company_name.trim() ? j.company_name.trim().slice(0, 120) : null,
      source: 'remotive',
      sourceId: String(id),
      url,
      publishedAt: parseDate(j.publication_date),
      deadline: null,
      category: typeof j.category === 'string' ? j.category.slice(0, 60) : 'Software development',
      location: location ? location.slice(0, 120) : null,
      remote: true,
      skills: Array.isArray(j.tags) ? (j.tags as unknown[]).filter((t): t is string => typeof t === 'string').slice(0, 10).map((t) => t.slice(0, 40)) : [],
      employmentType: typeof j.job_type === 'string' ? j.job_type.slice(0, 40) : null,
    });
  }
  return out;
}

export async function fetchRemotive(): Promise<ProjectCandidate[]> {
  const res = await fetch(ENDPOINT, {
    headers: { 'user-agent': `LookAfricaLeadHunter/1.0 ${process.env.APP_CONTACT_EMAIL ?? ''}`.trim() },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`remotive_http_${res.status}`);
  return parseRemotive(await res.json());
}
