import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminAuth, adminDb, normalizePrivateKey } from '@/lib/firebase/admin';
import { overpassEndpoints } from '@/lib/leads/adapters/osm';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Setup check for the operator. Open /api/health?key=<CRON_SECRET> after deploying.
 * It reports which settings are present (never their values) and whether the server can reach
 * Firebase Authentication and Firestore with the credentials it was given.
 */
function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = req.nextUrl.searchParams.get('key') ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

const has = (name: string) => Boolean(process.env[name] && process.env[name]!.trim());

async function probe(fn: () => Promise<unknown>): Promise<{ ok: boolean; problem?: string }> {
  try {
    await fn();
    return { ok: true };
  } catch (err) {
    const e = err as { code?: string | number; message?: string };
    return { ok: false, problem: `${e.code ?? 'error'}: ${(e.message ?? '').slice(0, 220)}` };
  }
}

/**
 * Runs one tiny version of every multi-field query the app makes. A query whose index is missing fails
 * with FAILED_PRECONDITION and an error message that contains a link that creates exactly that index.
 */
async function checkIndexes(): Promise<{ missing: { query: string; createLink: string | null }[]; checked: number }> {
  const db = adminDb();
  const U = '__health__';
  const now = Timestamp.now();
  const queries: [string, () => Promise<unknown>][] = [
    ['leads by owner, archived, updatedAt', () => db.collection('leads').where('ownerId', '==', U).where('archived', '==', false).orderBy('updatedAt', 'desc').limit(1).get()],
    ['leads by owner, archived, status, updatedAt', () => db.collection('leads').where('ownerId', '==', U).where('archived', '==', false).where('status', '==', 'x').orderBy('updatedAt', 'desc').limit(1).get()],
    ['leads follow-ups', () => db.collection('leads').where('ownerId', '==', U).where('archived', '==', false).where('followUpAt', '>', now).orderBy('followUpAt', 'asc').limit(1).get()],
    ['leads follow-ups due (count)', () => db.collection('leads').where('ownerId', '==', U).where('archived', '==', false).where('followUpAt', '<=', now).count().get()],
    ['audits by owner, createdAt', () => db.collection('audits').where('ownerId', '==', U).orderBy('createdAt', 'desc').limit(1).get()],
    ['audits completed this month (count)', () => db.collection('audits').where('ownerId', '==', U).where('status', '==', 'completed').where('completedAt', '>=', now).count().get()],
    ['audits by cache key', () => db.collection('audits').where('ownerId', '==', U).where('cacheKey', '==', 'x').orderBy('completedAt', 'desc').limit(1).get()],
    ['audits running by cache key', () => db.collection('audits').where('ownerId', '==', U).where('cacheKey', '==', 'x').where('status', 'in', ['pending', 'running']).limit(1).get()],
    ['audits pending too long', () => db.collection('audits').where('status', '==', 'pending').where('createdAt', '<', now).limit(1).get()],
    ['saved searches', () => db.collection('savedSearches').where('ownerId', '==', U).where('saved', '==', true).orderBy('createdAt', 'desc').limit(1).get()],
    ['outreach by owner', () => db.collection('outreach').where('ownerId', '==', U).orderBy('createdAt', 'desc').limit(1).get()],
    ['outreach by lead', () => db.collection('outreach').where('ownerId', '==', U).where('leadId', '==', 'x').orderBy('createdAt', 'desc').limit(1).get()],
    ['activity by owner', () => db.collection('activityLogs').where('ownerId', '==', U).orderBy('createdAt', 'desc').limit(1).get()],
    ['activity by lead', () => db.collection('activityLogs').where('ownerId', '==', U).where('leadId', '==', 'x').orderBy('createdAt', 'desc').limit(1).get()],
    ['payments by user', () => db.collection('payments').where('uid', '==', U).orderBy('createdAt', 'desc').limit(1).get()],
    ['payments by status', () => db.collection('payments').where('status', '==', 'initiated').where('createdAt', '>=', now).limit(1).get()],
    ['projects listed', () => db.collection('projects').where('status', '==', 'listed').orderBy('publishedAt', 'desc').limit(1).get()],
    ['projects not seen recently', () => db.collection('projects').where('source', '==', 'remotive').where('status', '==', 'listed').where('lastSeenInFeedAt', '<', now).limit(1).get()],
    ['subscriptions expiring', () => db.collection('subscriptions').where('status', '==', 'active').where('currentPeriodEnd', '<', now).limit(1).get()],
  ];
  const results = await Promise.all(
    queries.map(async ([name, fn]) => {
      try {
        await fn();
        return null;
      } catch (err) {
        const msg = (err as { message?: string }).message ?? '';
        const code = (err as { code?: number | string }).code;
        if (code === 9 || /FAILED_PRECONDITION|requires an index/i.test(msg)) {
          return { query: name, createLink: msg.match(/https:\/\/console\.firebase\.google\.com\/\S+/)?.[0] ?? null };
        }
        return { query: `${name} (error ${code ?? ''}: ${msg.slice(0, 120)})`, createLink: null };
      }
    }),
  );
  return { missing: results.filter((r): r is { query: string; createLink: string | null } => r !== null), checked: queries.length };
}

/** Sends a trivial query to each OpenStreetMap server so you can see which ones answer from this host. */
async function checkOverpass(): Promise<{ url: string; ok: boolean; ms: number; detail: string }[]> {
  const q = '[out:json][timeout:10];node(1);out;';
  return Promise.all(
    overpassEndpoints().map(async (url) => {
      const t = Date.now();
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': `LookAfricaLeadHunter/1.0${process.env.APP_CONTACT_EMAIL ? ` (${process.env.APP_CONTACT_EMAIL})` : ''}` },
          body: `data=${encodeURIComponent(q)}`,
          signal: AbortSignal.timeout(15_000),
        });
        return { url, ok: res.ok, ms: Date.now() - t, detail: `HTTP ${res.status}` };
      } catch (err) {
        const e = err as { name?: string; cause?: { code?: string } };
        return { url, ok: false, ms: Date.now() - t, detail: e.cause?.code ?? e.name ?? 'network error' };
      }
    }),
  );
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, problem: 'CRON_SECRET is not set on the server, so this check is switched off. Add it and redeploy.' }, { status: 404 });
  }
  if (!authorised(req)) return NextResponse.json({ ok: false, problem: 'Wrong or missing key.' }, { status: 401 });

  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'APP_URL',
    'CRON_SECRET',
  ];
  const optional = ['APP_CONTACT_EMAIL', 'PAGESPEED_API_KEY', 'ANTHROPIC_API_KEY', 'PESAPAL_ENV', 'PESAPAL_CONSUMER_KEY', 'PESAPAL_CONSUMER_SECRET', 'PESAPAL_IPN_ID', 'NEXT_PUBLIC_CONTACT_EMAIL'];

  const missing = required.filter((n) => !has(n));
  const key = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  const problems: string[] = [];
  if (missing.length) problems.push(`Missing required settings: ${missing.join(', ')}`);
  if (key && !/^-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----$/.test(key)) {
    problems.push('FIREBASE_PRIVATE_KEY does not look like a private key. Paste the whole "private_key" value from the service-account JSON file.');
  }
  if (has('FIREBASE_PROJECT_ID') && has('NEXT_PUBLIC_FIREBASE_PROJECT_ID') && process.env.FIREBASE_PROJECT_ID !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    problems.push('FIREBASE_PROJECT_ID and NEXT_PUBLIC_FIREBASE_PROJECT_ID are different. They must be the same project.');
  }
  if (has('APP_URL') && /\/$/.test(process.env.APP_URL!)) problems.push('APP_URL must not end with a slash.');
  if (has('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN') && /^https?:\/\//.test(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!)) {
    problems.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN must be a bare domain such as my-project.firebaseapp.com, with no https://.');
  }

  const [auth, firestore] = missing.some((n) => n.startsWith('FIREBASE_'))
    ? [{ ok: false, problem: 'Skipped: server Firebase settings are missing.' }, { ok: false, problem: 'Skipped: server Firebase settings are missing.' }]
    : await Promise.all([probe(() => adminAuth().listUsers(1)), probe(() => adminDb().collection('_health').doc('ping').get())]);

  const indexes = firestore.ok ? await checkIndexes() : { missing: [], checked: 0 };
  for (const m of indexes.missing) problems.push(`Missing Firestore index for "${m.query}". ${m.createLink ? `Open this link and click Create: ${m.createLink}` : 'Run: firebase deploy --only firestore:indexes'}`);
  const overpass = await checkOverpass();
  if (!overpass.some((o) => o.ok)) problems.push('No OpenStreetMap server answered from this host, so Find Leads cannot work. See "overpass" below.');
  if (!auth.ok) problems.push(`Firebase Authentication check failed. ${auth.problem}`);
  if (!firestore.ok) problems.push(`Firestore check failed. ${firestore.problem}`);

  return NextResponse.json({
    ok: problems.length === 0,
    problems,
    required: Object.fromEntries(required.map((n) => [n, has(n)])),
    optional: Object.fromEntries(optional.map((n) => [n, has(n)])),
    firebaseAuth: auth,
    firestore,
    indexes,
    overpass,
    note: 'NEXT_PUBLIC_ settings are baked in at build time: after adding or changing one on Vercel you must redeploy.',
  });
}
