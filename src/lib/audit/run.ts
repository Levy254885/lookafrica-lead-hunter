import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { logActivity } from '@/lib/activity';
import { performAudit } from '@/lib/audit/perform';
import { releaseUsage } from '@/lib/entitlements';
import { recomputeLeadScore } from '@/lib/leads/service';
import { errorFields, log } from '@/lib/logger';

/**
 * Runs one audit job. The transaction below claims the job (pending -> running), so two workers
 * cannot run the same audit. Failures that are ours return the reserved usage to the user.
 */
export async function executeAudit(auditId: string): Promise<void> {
  const db = adminDb();
  const ref = db.collection('audits').doc(auditId);

  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data()?.status !== 'pending') return null;
    tx.update(ref, { status: 'running', startedAt: FieldValue.serverTimestamp() });
    return snap.data() as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  });
  if (!claimed) return;

  try {
    const result = await performAudit(claimed.url as string);
    await ref.update({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      checkedAt: result.checkedAt,
      finalUrl: result.finalUrl,
      httpStatus: result.httpStatus,
      responseTimeMs: result.responseTimeMs,
      redirectChain: result.redirectChain,
      findings: result.findings,
      pagespeed: result.pagespeed,
      summary: result.summary,
      opportunities: result.opportunities,
      error: null,
    });
    if (claimed.leadId) {
      await db.collection('leads').doc(claimed.leadId as string).update({
        latestAuditId: auditId,
        updatedAt: FieldValue.serverTimestamp(),
      });
      await recomputeLeadScore(claimed.ownerId as string, claimed.leadId as string);
    }
    await logActivity(claimed.ownerId as string, {
      type: 'audit_completed',
      leadId: (claimed.leadId as string | null) ?? null,
      summary: `Audit completed for ${claimed.host}`,
      meta: { auditId },
    });
  } catch (err) {
    log('error', 'audit_failed', { auditId, ...errorFields(err) });
    await ref.update({
      status: 'failed',
      completedAt: FieldValue.serverTimestamp(),
      error: { code: 'audit_failed', message: 'The audit could not be completed. The audit was not charged to your allowance.' },
    });
    await releaseUsage(claimed.ownerId as string, 'audits', 1, claimed.usagePeriod as string);
  }
}

/**
 * Called by the scheduled job. Re-runs audits that were created but never started, and fails audits
 * that have been "running" far too long (for example when a serverless instance was stopped).
 */
export async function recoverStaleAudits(): Promise<{ restarted: number; failed: number }> {
  const db = adminDb();
  const now = Date.now();
  const pending = await db
    .collection('audits')
    .where('status', '==', 'pending')
    .where('createdAt', '<', Timestamp.fromMillis(now - 3 * 60_000))
    .limit(20)
    .get();
  for (const d of pending.docs) await executeAudit(d.id);

  const running = await db.collection('audits').where('status', '==', 'running').limit(50).get();
  let failed = 0;
  for (const d of running.docs) {
    const started = d.data().startedAt?.toMillis?.() as number | undefined;
    if (!started || now - started < 10 * 60_000) continue;
    await d.ref.update({
      status: 'failed',
      completedAt: FieldValue.serverTimestamp(),
      error: { code: 'timed_out', message: 'The audit took too long and was stopped. It was not charged to your allowance.' },
    });
    await releaseUsage(d.data().ownerId as string, 'audits', 1, d.data().usagePeriod as string);
    failed++;
  }
  return { restarted: pending.size, failed };
}
