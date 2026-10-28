import 'server-only';
import { createHash } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { errorFields, log } from '@/lib/logger';
import { fetchRemotive, remotiveEnabled } from '@/lib/projects/remotive';
import { toPlain } from '@/lib/serialize';

const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

function projectDocId(source: string, sourceId: string): string {
  return createHash('sha256').update(`${source}:${sourceId}`).digest('hex').slice(0, 32);
}

export type RefreshOutcome =
  | { state: 'disabled'; message: string }
  | { state: 'fresh'; message: string; lastCheckedAt: string }
  | { state: 'refreshed'; count: number; lastCheckedAt: string }
  | { state: 'failed'; message: string };

/**
 * Refreshes project listings from the enabled source. A lock written before the fetch keeps
 * concurrent callers from hammering the provider. Listings absent from the newest fetch are marked
 * "not_in_latest_feed" rather than deleted so users keep their context.
 */
export async function refreshProjects(): Promise<RefreshOutcome> {
  if (!remotiveEnabled()) {
    return { state: 'disabled', message: 'No project source is enabled. See the Data sources section of the admin console.' };
  }
  const db = adminDb();
  const stateRef = db.collection('sourceState').doc('remotive');
  const now = Date.now();

  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(stateRef);
    const last = snap.data()?.lastAttemptAt?.toMillis?.() as number | undefined;
    if (last && now - last < REFRESH_INTERVAL_MS) return { claimed: false, last };
    tx.set(stateRef, { lastAttemptAt: Timestamp.fromMillis(now) }, { merge: true });
    return { claimed: true, last: undefined };
  });
  if (!claimed.claimed) {
    return {
      state: 'fresh',
      message: 'Listings were checked recently. The source is polled at most every 6 hours.',
      lastCheckedAt: new Date(claimed.last ?? now).toISOString(),
    };
  }

  try {
    const items = await fetchRemotive();
    const refs = items.map((p) => db.collection('projects').doc(projectDocId(p.source, p.sourceId)));
    const existing = refs.length ? await db.getAll(...refs) : [];
    const existingIds = new Set(existing.filter((s) => s.exists).map((s) => s.id));
    const checkedAt = Timestamp.fromMillis(now);

    for (let i = 0; i < items.length; i += 400) {
      const batch = db.batch();
      items.slice(i, i + 400).forEach((p, j) => {
        const ref = refs[i + j];
        const base = {
          title: p.title,
          organization: p.organization,
          organizationVerified: false,
          source: p.source,
          sourceId: p.sourceId,
          url: p.url,
          publishedAt: p.publishedAt ? Timestamp.fromDate(new Date(p.publishedAt)) : null,
          deadline: null,
          category: p.category,
          location: p.location,
          remote: p.remote,
          skills: p.skills,
          employmentType: p.employmentType,
          status: 'listed',
          lastCheckedAt: checkedAt,
          lastSeenInFeedAt: checkedAt,
        };
        if (existingIds.has(ref.id)) batch.set(ref, base, { merge: true });
        else batch.set(ref, { ...base, firstSeenAt: checkedAt });
      });
      await batch.commit();
    }

    // Mark listings that disappeared from the feed.
    const stale = await db
      .collection('projects')
      .where('source', '==', 'remotive')
      .where('status', '==', 'listed')
      .where('lastSeenInFeedAt', '<', checkedAt)
      .limit(400)
      .get();
    if (!stale.empty) {
      const batch = db.batch();
      stale.docs.forEach((d) => batch.update(d.ref, { status: 'not_in_latest_feed', lastCheckedAt: checkedAt }));
      await batch.commit();
    }

    await stateRef.set(
      { lastSuccessAt: checkedAt, lastCount: items.length, lastError: FieldValue.delete() },
      { merge: true },
    );
    return { state: 'refreshed', count: items.length, lastCheckedAt: checkedAt.toDate().toISOString() };
  } catch (err) {
    log('error', 'project_refresh_failed', errorFields(err));
    await stateRef.set({ lastError: 'Fetch failed. See server logs.', lastErrorAt: FieldValue.serverTimestamp() }, { merge: true });
    return { state: 'failed', message: 'The project source could not be reached. Existing listings are unchanged.' };
  }
}

export interface ProjectRow {
  id: string;
  title: string;
  organization: string | null;
  source: string;
  url: string;
  publishedAt: string | null;
  deadline: string | null;
  category: string;
  location: string | null;
  remote: boolean;
  skills: string[];
  status: string;
  lastCheckedAt: string | null;
  firstSeenAt: string | null;
}

export async function listProjects(opts: { limit?: number; includeGone?: boolean } = {}): Promise<ProjectRow[]> {
  const q = adminDb()
    .collection('projects')
    .where('status', '==', 'listed')
    .orderBy('publishedAt', 'desc')
    .limit(Math.min(opts.limit ?? 50, 100));
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...toPlain<Omit<ProjectRow, 'id'>>(d.data()) }));
}

export async function countNewProjects(sinceMs: number): Promise<number> {
  try {
    const agg = await adminDb()
      .collection('projects')
      .where('firstSeenAt', '>=', Timestamp.fromMillis(sinceMs))
      .count()
      .get();
    return agg.data().count;
  } catch {
    return 0;
  }
}

export async function getProjectSourceState(): Promise<{ lastSuccessAt: string | null; lastError: string | null }> {
  const snap = await adminDb().collection('sourceState').doc('remotive').get();
  const d = snap.data() ?? {};
  return {
    lastSuccessAt: d.lastSuccessAt?.toDate?.().toISOString() ?? null,
    lastError: (d.lastError as string) ?? null,
  };
}
