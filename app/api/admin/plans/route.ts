import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { parseJson, route } from '@/lib/api';
import { adminDb } from '@/lib/firebase/admin';
import { invalidatePlansCache } from '@/lib/entitlements';
import { Errors } from '@/lib/errors';
import { logActivity } from '@/lib/activity';
import { plansDocSchema } from '@/lib/plans';

/** Admin-only: replaces plan configuration after validation. Every change is written to adminAuditLogs. */
export const PUT = route({ auth: 'admin' }, async ({ req, user }) => {
  const body = await parseJson(req, z.object({ config: plansDocSchema }));
  for (const id of ['free', 'starter', 'pro', 'agency'] as const) {
    if (body.config.plans[id].id !== id) throw Errors.badRequest('Plan ids must match their keys.');
  }
  await adminDb().collection('systemConfig').doc('plans').set(body.config);
  await adminDb().collection('adminAuditLogs').add({ actor: user.uid, action: 'plans_updated', createdAt: FieldValue.serverTimestamp() });
  invalidatePlansCache();
  await logActivity(user.uid, { type: 'subscription_changed', summary: 'Plan configuration updated by admin' });
  return { ok: true };
});
