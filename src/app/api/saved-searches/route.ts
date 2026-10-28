import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { ApiError } from '@/lib/errors';
import { parseJson, route } from '@/lib/api';
import { adminDb } from '@/lib/firebase/admin';
import { requireFeature } from '@/lib/entitlements';

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  params: z.object({
    country: z.string().length(2),
    city: z.string().min(2).max(60),
    category: z.string().min(2).max(30),
    websiteStatus: z.enum(['any', 'with', 'without']),
    limit: z.number().int().min(1).max(100),
  }),
});

export const POST = route({ auth: 'user' }, async ({ req, user }) => {
  await requireFeature(user, 'savedSearches');
  const body = await parseJson(req, schema);
  const col = adminDb().collection('savedSearches');
  const count = await col.where('ownerId', '==', user.uid).where('saved', '==', true).count().get();
  if (count.data().count >= 50) throw new ApiError(409, 'limit_reached', 'You can keep up to 50 saved searches.');
  const ref = await col.add({ ownerId: user.uid, saved: true, name: body.name, params: body.params, resultCount: null, createdAt: FieldValue.serverTimestamp() });
  return { id: ref.id };
});
