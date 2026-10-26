import 'server-only';
import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { Errors } from '@/lib/errors';
import { logActivity } from '@/lib/activity';
import { validatePublicUrl } from '@/lib/audit/ssrf';
import { reserveUsage } from '@/lib/entitlements';
import { usagePeriodKey } from '@/lib/entitlements-core';
import { getOwnedLead, recomputeLeadScore } from '@/lib/leads/service';
import type { SessionUser } from '@/lib/types';

const REUSE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Creates an audit job. Rules that decide whether it costs usage:
 * - A completed audit of the same address for the same user within 24 hours is reused at no charge.
 * - An audit of the same address that is already pending or running is returned at no charge.
 * - Otherwise one audit is reserved up front and returned if the audit fails on our side.
 */
export async function requestAudit(
  user: SessionUser,
  input: { url: string; leadId?: string | null },
): Promise<{ auditId: string; reused: boolean }> {
  const check = validatePublicUrl(input.url);
  if (!check.ok) throw Errors.badRequest(check.reason);
  const url = check.url.toString();
  const host = check.url.hostname;
  const cacheKey = createHash('sha256').update(`${user.uid}:${url}`).digest('hex').slice(0, 32);
  const db = adminDb();

  if (input.leadId) await getOwnedLead(user.uid, input.leadId);

  const inflight = await db
    .collection('audits')
    .where('ownerId', '==', user.uid)
    .where('cacheKey', '==', cacheKey)
    .where('status', 'in', ['pending', 'running'])
    .limit(1)
    .get();
  if (!inflight.empty) return { auditId: inflight.docs[0].id, reused: true };

  const recent = await db
    .collection('audits')
    .where('ownerId', '==', user.uid)
    .where('cacheKey', '==', cacheKey)
    .orderBy('completedAt', 'desc')
    .limit(1)
    .get();
  const last = recent.docs[0];
  const lastAt = last?.data().completedAt?.toMillis?.() as number | undefined;
  if (last && last.data().status === 'completed' && lastAt && Date.now() - lastAt < REUSE_WINDOW_MS) {
    if (input.leadId) {
      await db.collection('leads').doc(input.leadId).update({ latestAuditId: last.id, updatedAt: FieldValue.serverTimestamp() });
      await recomputeLeadScore(user.uid, input.leadId);
    }
    return { auditId: last.id, reused: true };
  }

  await reserveUsage(user, 'audits', 1);
  const ref = db.collection('audits').doc();
  await ref.set({
    ownerId: user.uid,
    teamId: null,
    leadId: input.leadId ?? null,
    url,
    host,
    cacheKey,
    status: 'pending',
    usagePeriod: usagePeriodKey(Date.now()),
    findings: [],
    summary: null,
    opportunities: [],
    pagespeed: null,
    finalUrl: null,
    httpStatus: null,
    redirectChain: [],
    error: null,
    createdAt: FieldValue.serverTimestamp(),
    startedAt: null,
    completedAt: null,
  });
  await logActivity(user.uid, {
    type: 'audit_requested',
    leadId: input.leadId ?? null,
    summary: `Audit requested for ${host}`,
  });
  return { auditId: ref.id, reused: false };
}
