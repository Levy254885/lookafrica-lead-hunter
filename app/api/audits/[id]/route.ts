import { route } from '@/lib/api';
import { adminDb } from '@/lib/firebase/admin';
import { Errors } from '@/lib/errors';
import { toPlain } from '@/lib/serialize';

export const GET = route<{ id: string }>({ auth: 'user' }, async ({ user, params }) => {
  const snap = await adminDb().collection('audits').doc(params.id).get();
  if (!snap.exists || snap.data()?.ownerId !== user.uid) throw Errors.notFound('Audit not found.');
  const d = toPlain<Record<string, unknown>>(snap.data());
  return { id: snap.id, status: d.status, error: d.error, completedAt: d.completedAt };
});
