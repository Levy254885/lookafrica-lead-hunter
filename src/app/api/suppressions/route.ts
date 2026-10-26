import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { parseJson, route } from '@/lib/api';
import { adminDb } from '@/lib/firebase/admin';
import { Errors } from '@/lib/errors';
import { normalizeEmail } from '@/lib/leads/normalize';
import { suppressionId } from '@/lib/proposals/service';

const schema = z.object({ type: z.enum(['email', 'domain']), value: z.string().trim().min(3).max(254), reason: z.string().max(200).optional() });

/** Adds an address or domain to the user's opt-out list. Drafts to suppressed recipients cannot be marked as sent. */
export const POST = route({ auth: 'user' }, async ({ req, user }) => {
  const b = await parseJson(req, schema);
  const value = b.type === 'email' ? normalizeEmail(b.value) : b.value.toLowerCase().replace(/^www\./, '');
  if (!value || (b.type === 'domain' && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(value))) throw Errors.badRequest('Enter a valid value.');
  await adminDb().collection('suppressions').doc(suppressionId(user.uid, b.type, value)).set({
    ownerId: user.uid, type: b.type, value, reason: b.reason ?? null, createdAt: FieldValue.serverTimestamp(),
  });
  return { ok: true };
});
