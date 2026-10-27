import { route } from '@/lib/api';
import { adminDb } from '@/lib/firebase/admin';
import { Errors } from '@/lib/errors';

export const DELETE = route<{ id: string }>({ auth: 'user' }, async ({ user, params }) => {
  const ref = adminDb().collection('savedSearches').doc(params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.ownerId !== user.uid) throw Errors.notFound();
  await ref.delete();
  return { ok: true };
});
