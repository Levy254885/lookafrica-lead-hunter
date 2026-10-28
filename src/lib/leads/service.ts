import 'server-only';
import { createHash } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { Errors } from '@/lib/errors';
import { logActivity } from '@/lib/activity';
import { releaseUsage, reserveUsage } from '@/lib/entitlements';
import { usagePeriodKey } from '@/lib/entitlements-core';
import { dedupeKey, leadDocId, recordDocId } from '@/lib/leads/normalize';
import { computeScore } from '@/lib/scoring';
import { toPlain } from '@/lib/serialize';
import { getLeadAdapter } from '@/lib/sources';
import { getProfile } from '@/lib/users';
import type { SearchParams } from '@/lib/leads/adapters/types';
import type { Finding, LeadCandidate, OpportunityIndicator, SessionUser } from '@/lib/types';

const SEARCH_CACHE_MS = 6 * 60 * 60 * 1000;
const RECORD_CACHE_MS = 24 * 60 * 60 * 1000;

function isAlreadyExists(err: unknown): boolean {
  return (err as { code?: number | string })?.code === 6 || (err as { code?: string })?.code === 'already-exists';
}

export interface SearchResultItem {
  candidate: LeadCandidate;
  dedupeKey: string;
  /** Present when this business is already in the user's workspace. */
  leadId: string | null;
  previewScore: number;
  signals: { text: string; level: 'inferred' | 'reported' | 'unknown' }[];
}

export interface SearchResponse {
  source: string;
  fromCache: boolean;
  retrievedAt: string;
  items: SearchResultItem[];
  notice: string | null;
}

/** Search is free: it does not consume lead quota. Saving a record does. */
export async function searchLeads(user: SessionUser, params: SearchParams, sourceId = 'osm'): Promise<SearchResponse> {
  const adapter = getLeadAdapter(sourceId);
  if (!adapter) throw Errors.badRequest('Unknown data source.');
  const status = adapter.status();
  if (!status.available) throw Errors.unavailable('source_unavailable', status.reason ?? 'This source is not available.');

  const db = adminDb();
  const cacheKey = createHash('sha256').update(JSON.stringify({ sourceId, ...params })).digest('hex').slice(0, 40);
  const cacheRef = db.collection('searchCache').doc(cacheKey);
  const cached = await cacheRef.get();
  let candidates: LeadCandidate[];
  let retrievedAt: string;
  let fromCache = false;

  const cachedAt = cached.data()?.retrievedAt?.toMillis?.() as number | undefined;
  if (cached.exists && cachedAt && Date.now() - cachedAt < SEARCH_CACHE_MS) {
    candidates = cached.data()!.candidates as LeadCandidate[];
    retrievedAt = new Date(cachedAt).toISOString();
    fromCache = true;
  } else {
    candidates = await adapter.search(params);
    retrievedAt = new Date().toISOString();
    await cacheRef.set({
      candidates,
      retrievedAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + 2 * SEARCH_CACHE_MS),
    });
    // Server-written records let "save lead" avoid trusting anything the browser sends back.
    for (let i = 0; i < candidates.length; i += 400) {
      const batch = db.batch();
      for (const c of candidates.slice(i, i + 400)) {
        batch.set(db.collection('sourceRecords').doc(recordDocId(c.provenance.source, c.provenance.sourceId)), {
          candidate: c,
          retrievedAt: Timestamp.now(),
          expiresAt: Timestamp.fromMillis(Date.now() + 7 * 86_400_000),
        });
      }
      await batch.commit();
    }
  }

  const profile = await getProfile(user.uid);
  const keys = candidates.map((c) => dedupeKey(c));
  const refs = keys.map((k) => db.collection('leads').doc(leadDocId(user.uid, k)));
  const existing = refs.length ? await db.getAll(...refs) : [];
  const savedIds = new Set(existing.filter((s) => s.exists && s.data()?.archived !== true).map((s) => s.id));

  const items: SearchResultItem[] = candidates.map((c, i) => {
    const signals: SearchResultItem['signals'] = [];
    if (!c.website) {
      signals.push({
        text: 'No website is listed for this record in the source. This does not confirm the business has no website; run an audit or check manually.',
        level: 'inferred',
      });
    } else {
      signals.push({ text: 'A website is listed by the source. Run an audit to measure it.', level: 'reported' });
    }
    const score = computeScore({
      findings: null,
      opportunityServices: [],
      userServices: profile.services,
      contact: { email: Boolean(c.email), phone: Boolean(c.phone), website: Boolean(c.website) },
      dataDate: { lastVerifiedAt: c.provenance.lastVerifiedAt, retrievedAt: c.provenance.retrievedAt },
      buyingSignal: null,
      nowMs: Date.now(),
    });
    return {
      candidate: c,
      dedupeKey: keys[i],
      leadId: savedIds.has(refs[i].id) ? refs[i].id : null,
      previewScore: score.total,
      signals,
    };
  });

  await recordSearchHistory(user.uid, params, items.length);

  return {
    source: sourceId,
    fromCache,
    retrievedAt,
    items,
    notice:
      items.length === 0
        ? 'No matching records were found in this source. That does not mean such businesses do not exist; coverage varies by area and category.'
        : null,
  };
}

async function recordSearchHistory(ownerId: string, params: SearchParams, resultCount: number): Promise<void> {
  const col = adminDb().collection('savedSearches');
  await col.add({
    ownerId,
    saved: false,
    name: null,
    params,
    resultCount,
    createdAt: FieldValue.serverTimestamp(),
  });
  // Keep the 50 most recent history entries.
  const old = await col.where('ownerId', '==', ownerId).where('saved', '==', false).orderBy('createdAt', 'desc').offset(50).limit(100).get();
  if (!old.empty) {
    const batch = adminDb().batch();
    old.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

async function loadSourceRecord(source: string, sourceId: string): Promise<LeadCandidate> {
  const ref = adminDb().collection('sourceRecords').doc(recordDocId(source, sourceId));
  const snap = await ref.get();
  const at = snap.data()?.retrievedAt?.toMillis?.() as number | undefined;
  if (snap.exists && at && Date.now() - at < RECORD_CACHE_MS * 7) {
    return snap.data()!.candidate as LeadCandidate;
  }
  const adapter = getLeadAdapter(source);
  if (!adapter) throw Errors.badRequest('Unknown data source.');
  const fresh = await adapter.fetchById(sourceId);
  if (!fresh) throw Errors.notFound('That record is no longer available from the source.');
  await ref.set({
    candidate: fresh,
    retrievedAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + 7 * 86_400_000),
  });
  return fresh;
}

/**
 * Saves a lead from a server-held source record. The same business is never saved twice (the
 * document id is derived from the owner and duplicate key) and re-saving an existing lead does not
 * consume lead quota.
 */
export async function saveLead(
  user: SessionUser,
  ref: { source: string; sourceId: string },
): Promise<{ leadId: string; created: boolean }> {
  const candidate = await loadSourceRecord(ref.source, ref.sourceId);
  const key = dedupeKey(candidate);
  const id = leadDocId(user.uid, key);
  const leadRef = adminDb().collection('leads').doc(id);

  const existing = await leadRef.get();
  if (existing.exists) {
    if (existing.data()?.ownerId !== user.uid) throw Errors.notFound();
    if (existing.data()?.archived === true) {
      await leadRef.update({ archived: false, updatedAt: FieldValue.serverTimestamp() });
      await logActivity(user.uid, { type: 'lead_restored', leadId: id, summary: `Restored ${candidate.name} from the archive` });
    }
    return { leadId: id, created: false };
  }

  await reserveUsage(user, 'leads', 1);
  try {
    const profile = await getProfile(user.uid);
    const score = computeScore({
      findings: null,
      opportunityServices: [],
      userServices: profile.services,
      contact: { email: Boolean(candidate.email), phone: Boolean(candidate.phone), website: Boolean(candidate.website) },
      dataDate: { lastVerifiedAt: candidate.provenance.lastVerifiedAt, retrievedAt: candidate.provenance.retrievedAt },
      buyingSignal: null,
      nowMs: Date.now(),
    });
    await leadRef.create({
      ownerId: user.uid,
      teamId: null,
      name: candidate.name,
      category: candidate.category,
      categoryLabel: candidate.categoryLabel,
      city: candidate.city,
      country: candidate.country,
      address: candidate.address,
      lat: candidate.lat,
      lng: candidate.lng,
      website: candidate.website,
      phone: candidate.phone,
      email: candidate.email,
      provenance: candidate.provenance,
      fieldEvidence: {
        name: 'reported',
        category: 'reported',
        location: 'reported',
        website: candidate.website ? 'reported' : 'unknown',
        phone: candidate.phone ? 'reported' : 'unknown',
        email: candidate.email ? 'reported' : 'unknown',
      },
      dedupeKey: key,
      status: 'new',
      tags: [],
      notes: '',
      followUpAt: null,
      archived: false,
      outcome: null,
      buyingSignal: null,
      latestAuditId: null,
      opportunities: [],
      score,
      usagePeriod: usagePeriodKey(Date.now()),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    await releaseUsage(user.uid, 'leads', 1);
    if (isAlreadyExists(err)) return { leadId: id, created: false };
    throw err;
  }
  await logActivity(user.uid, { type: 'lead_saved', leadId: id, summary: `Saved ${candidate.name}`, meta: { source: ref.source } });
  return { leadId: id, created: true };
}

export async function getOwnedLead(ownerId: string, leadId: string) {
  const ref = adminDb().collection('leads').doc(leadId);
  const snap = await ref.get();
  // Not-found rather than forbidden, so ids belonging to other accounts are not confirmed to exist.
  if (!snap.exists || snap.data()?.ownerId !== ownerId) throw Errors.notFound('Lead not found.');
  return { ref, data: snap.data() as Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface LeadPatch {
  notes?: string;
  tags?: string[];
  status?: string;
  followUpAt?: string | null;
  archived?: boolean;
  outcome?: { result: 'won' | 'lost' | 'not_a_fit'; reason?: string; valueKes?: number } | null;
}

export async function updateLead(user: SessionUser, leadId: string, patch: LeadPatch): Promise<void> {
  const { ref, data } = await getOwnedLead(user.uid, leadId);
  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

  if (patch.status !== undefined) {
    const profile = await getProfile(user.uid);
    if (!profile.pipelineStatuses.some((s) => s.id === patch.status)) throw Errors.badRequest('Unknown pipeline status.');
    update.status = patch.status;
  }
  if (patch.notes !== undefined) update.notes = patch.notes;
  if (patch.tags !== undefined) update.tags = patch.tags;
  if (patch.followUpAt !== undefined) {
    update.followUpAt = patch.followUpAt ? Timestamp.fromDate(new Date(patch.followUpAt)) : null;
  }
  if (patch.archived !== undefined) update.archived = patch.archived;
  if (patch.outcome !== undefined) update.outcome = patch.outcome;

  await ref.update(update);

  if (patch.status !== undefined && patch.status !== data.status) {
    await logActivity(user.uid, {
      type: 'lead_status_changed',
      leadId,
      summary: `${data.name}: ${data.status} to ${patch.status}`,
      meta: { from: data.status, to: patch.status },
    });
  } else if (patch.archived !== undefined && patch.archived !== data.archived) {
    await logActivity(user.uid, {
      type: patch.archived ? 'lead_archived' : 'lead_restored',
      leadId,
      summary: `${patch.archived ? 'Archived' : 'Restored'} ${data.name}`,
    });
  } else {
    await logActivity(user.uid, { type: 'lead_updated', leadId, summary: `Updated ${data.name}` });
  }
}

/** Recomputes a lead's score and opportunity indicators from its latest completed audit. */
export async function recomputeLeadScore(ownerId: string, leadId: string): Promise<void> {
  const { ref, data } = await getOwnedLead(ownerId, leadId);
  const profile = await getProfile(ownerId);
  let findings: Finding[] | null = null;
  let opportunities: OpportunityIndicator[] = [];
  if (data.latestAuditId) {
    const audit = await adminDb().collection('audits').doc(data.latestAuditId as string).get();
    if (audit.exists && audit.data()?.ownerId === ownerId && audit.data()?.status === 'completed') {
      findings = audit.data()!.findings as Finding[];
      opportunities = (audit.data()!.opportunities as OpportunityIndicator[]) ?? [];
    }
  }
  const score = computeScore({
    findings,
    opportunityServices: opportunities.map((o) => o.service),
    userServices: profile.services,
    contact: { email: Boolean(data.email), phone: Boolean(data.phone), website: Boolean(data.website) },
    dataDate: { lastVerifiedAt: data.provenance?.lastVerifiedAt ?? null, retrievedAt: data.provenance?.retrievedAt },
    buyingSignal: data.buyingSignal ?? null,
    nowMs: Date.now(),
  });
  await ref.update({ score, opportunities, updatedAt: FieldValue.serverTimestamp() });
}

export interface LeadRow {
  id: string;
  name: string;
  categoryLabel: string;
  city: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  tags: string[];
  followUpAt: string | null;
  archived: boolean;
  score: { total: number; max: number };
  updatedAt: string | null;
  createdAt: string | null;
  provenance: { sourceLabel: string; sourceUrl: string; retrievedAt: string; attribution: string };
}

export async function listLeads(
  ownerId: string,
  opts: { status?: string; archived?: boolean; limit?: number } = {},
): Promise<LeadRow[]> {
  let q = adminDb()
    .collection('leads')
    .where('ownerId', '==', ownerId)
    .where('archived', '==', opts.archived ?? false);
  if (opts.status) q = q.where('status', '==', opts.status);
  const snap = await q.orderBy('updatedAt', 'desc').limit(Math.min(opts.limit ?? 200, 500)).get();
  return snap.docs.map((d) => ({ id: d.id, ...toPlain<Omit<LeadRow, 'id'>>(d.data()) }));
}
