import 'server-only';
import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { Errors } from '@/lib/errors';
import { logActivity } from '@/lib/activity';
import { releaseUsage, reserveUsage } from '@/lib/entitlements';
import { domainOf, normalizeEmail } from '@/lib/leads/normalize';
import { getOwnedLead } from '@/lib/leads/service';
import { errorFields, log } from '@/lib/logger';
import { aiConfigured, aiDraft, templateDraft, type DraftContext, type Tone } from '@/lib/proposals/generate';
import { getProfile } from '@/lib/users';
import type { Finding, SessionUser } from '@/lib/types';

export function suppressionId(ownerId: string, type: 'email' | 'domain', value: string): string {
  return `${ownerId}_${createHash('sha256').update(`${type}:${value}`).digest('hex').slice(0, 24)}`;
}

/** Whether the lead's email or website domain is on the owner's suppression (opt-out) list. */
export async function isSuppressed(ownerId: string, lead: { email: string | null; website: string | null }): Promise<boolean> {
  const checks: string[] = [];
  const email = normalizeEmail(lead.email);
  if (email) {
    checks.push(suppressionId(ownerId, 'email', email));
    const d = email.split('@')[1];
    if (d) checks.push(suppressionId(ownerId, 'domain', d));
  }
  const domain = domainOf(lead.website);
  if (domain) checks.push(suppressionId(ownerId, 'domain', domain));
  if (checks.length === 0) return false;
  const snaps = await adminDb().getAll(...checks.map((id) => adminDb().collection('suppressions').doc(id)));
  return snaps.some((s) => s.exists);
}

export async function createDraft(
  user: SessionUser,
  input: { leadId: string; service: string; tone: Tone; channel: 'email' | 'message' },
): Promise<{ draftId: string; generator: 'ai' | 'template'; notice: string | null; suppressed: boolean }> {
  const { data: lead } = await getOwnedLead(user.uid, input.leadId);
  const profile = await getProfile(user.uid);

  let findings: Finding[] = [];
  let auditDate: string | null = null;
  let auditId: string | null = null;
  if (lead.latestAuditId) {
    const a = await adminDb().collection('audits').doc(lead.latestAuditId as string).get();
    if (a.exists && a.data()?.ownerId === user.uid && a.data()?.status === 'completed') {
      auditId = a.id;
      auditDate = (a.data()!.checkedAt as string) ?? null;
      findings = (a.data()!.findings as Finding[]).filter((f) => f.basis === 'measured' && (f.result === 'fail' || f.result === 'warn'));
      const order = { high: 3, medium: 2, low: 1, info: 0 } as const;
      findings.sort((x, y) => order[y.severity] - order[x.severity]);
    }
  }

  const ctx: DraftContext = {
    lead: {
      name: lead.name,
      categoryLabel: lead.categoryLabel,
      city: lead.city,
      website: lead.website,
      sourceLabel: lead.provenance?.sourceLabel ?? 'a public directory',
    },
    findings: findings.map(({ id, check, evidence, recommendation, severity }) => ({ id, check, evidence, recommendation, severity })),
    auditDate,
    service: input.service,
    senderName: profile.displayName,
    tone: input.tone,
  };

  let generator: 'ai' | 'template' = 'template';
  let model: string | null = null;
  let notice: string | null = null;
  let draft = templateDraft(ctx);

  if (aiConfigured()) {
    await reserveUsage(user, 'drafts', 1);
    try {
      const out = await aiDraft(ctx);
      draft = out.draft;
      model = out.model;
      generator = 'ai';
    } catch (err) {
      log('warn', 'ai_draft_failed', errorFields(err));
      await releaseUsage(user.uid, 'drafts', 1);
      notice = 'AI drafting is temporarily unavailable, so a template draft was created. It did not use your AI draft allowance.';
    }
  } else {
    notice = 'AI drafting is not configured on this deployment. A template draft was created from the evidence on file and did not use your AI draft allowance.';
  }

  const suppressed = await isSuppressed(user.uid, lead as { email: string | null; website: string | null });
  const ref = adminDb().collection('outreach').doc();
  await ref.set({
    ownerId: user.uid,
    teamId: null,
    leadId: input.leadId,
    leadName: lead.name,
    kind: 'proposal',
    channel: input.channel,
    service: input.service,
    tone: input.tone,
    subject: draft.subject,
    body: draft.body,
    generator,
    model,
    basedOn: { auditId, findingIds: findings.slice(0, 4).map((f) => f.id) },
    status: 'draft',
    suppressed,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await logActivity(user.uid, {
    type: 'draft_created',
    leadId: input.leadId,
    summary: `Created a ${generator === 'ai' ? 'AI' : 'template'} draft for ${lead.name}`,
  });
  return { draftId: ref.id, generator, notice, suppressed };
}

export async function updateDraft(
  user: SessionUser,
  draftId: string,
  patch: { subject?: string; body?: string; status?: 'draft' | 'approved' | 'sent_manually'; moveLeadToContacted?: boolean },
): Promise<void> {
  const ref = adminDb().collection('outreach').doc(draftId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.ownerId !== user.uid) throw Errors.notFound('Draft not found.');
  const d = snap.data()!;
  if (patch.status === 'sent_manually' && d.suppressed === true) {
    throw Errors.conflict('This recipient is on your opt-out list. Remove them from the list first if that was a mistake.');
  }
  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (patch.subject !== undefined) update.subject = patch.subject;
  if (patch.body !== undefined) update.body = patch.body;
  if (patch.status !== undefined) update.status = patch.status;
  await ref.update(update);

  if (patch.status === 'sent_manually') {
    await logActivity(user.uid, {
      type: 'draft_marked_sent',
      leadId: d.leadId as string,
      summary: `Marked draft to ${d.leadName} as sent (sent by you outside the app)`,
    });
    if (patch.moveLeadToContacted) {
      const lead = await adminDb().collection('leads').doc(d.leadId as string).get();
      if (lead.exists && lead.data()?.ownerId === user.uid && ['new', 'reviewed', 'qualified'].includes(lead.data()?.status as string)) {
        await lead.ref.update({ status: 'contacted', updatedAt: FieldValue.serverTimestamp() });
        await logActivity(user.uid, { type: 'lead_status_changed', leadId: d.leadId as string, summary: `${d.leadName}: moved to contacted` });
      }
    }
  }
}
