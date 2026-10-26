import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { parseJson, route } from '@/lib/api';
import { adminDb } from '@/lib/firebase/admin';
import { SERVICES } from '@/lib/types';
import { COUNTRY_LABEL } from '@/lib/leads/catalog';

const schema = z
  .object({
    displayName: z.string().trim().min(1).max(80),
    country: z.string().length(2).refine((c) => c in COUNTRY_LABEL, 'Unsupported country'),
    services: z.array(z.enum(SERVICES.map((s) => s.id) as [string, ...string[]])).max(12),
  })
  .strict();

export const PATCH = route({ auth: 'user' }, async ({ req, user }) => {
  const p = await parseJson(req, schema);
  await adminDb().collection('users').doc(user.uid).set({ ...p, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true };
});
