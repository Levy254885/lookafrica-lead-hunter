import { z } from 'zod';
import { parseJson, route } from '@/lib/api';
import { adminDb } from '@/lib/firebase/admin';
import { Errors } from '@/lib/errors';
import { verifyAndApply } from '@/lib/payments/service';

const schema = z.object({ paymentId: z.string().min(8).max(64) });

/**
 * Called when the user returns from the provider. The return itself proves nothing: this endpoint asks
 * the provider for the authoritative status of the user's own payment and reports what it found.
 */
export const POST = route({ auth: 'user', rate: { name: 'verify', limit: 30, windowSec: 600 } }, async ({ req, user }) => {
  const { paymentId } = await parseJson(req, schema);
  const snap = await adminDb().collection('payments').doc(paymentId).get();
  if (!snap.exists || snap.data()?.uid !== user.uid) throw Errors.notFound('Payment not found.');
  const trackingId = snap.data()?.orderTrackingId as string | null;
  if (!trackingId) return { outcome: 'pending' };
  return { outcome: await verifyAndApply(trackingId, 'return') };
});
