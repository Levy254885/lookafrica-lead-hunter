import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { parseJson, route } from '@/lib/api';
import { adminDb } from '@/lib/firebase/admin';
import { Errors } from '@/lib/errors';
import { verifyAndApply } from '@/lib/payments/service';

/** Admin-only manual reconciliation. It re-asks the provider; it never marks a payment complete by itself. */
export const POST = route({ auth: 'admin' }, async ({ req, user }) => {
  const { paymentId } = await parseJson(req, z.object({ paymentId: z.string().min(8).max(64) }));
  const snap = await adminDb().collection('payments').doc(paymentId).get();
  if (!snap.exists) throw Errors.notFound('Payment not found.');
  const tracking = snap.data()?.orderTrackingId as string | null;
  if (!tracking) throw Errors.conflict('This payment has no provider tracking id.');
  const outcome = await verifyAndApply(tracking, 'reconcile');
  await adminDb().collection('adminAuditLogs').add({ actor: user.uid, action: 'payment_reconciled', paymentId, outcome, createdAt: FieldValue.serverTimestamp() });
  return { outcome };
});
