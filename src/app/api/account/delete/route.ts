import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJson, route } from '@/lib/api';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { Errors } from '@/lib/errors';
import { SESSION_COOKIE } from '@/lib/auth/session';

const schema = z.object({ confirm: z.literal('DELETE') });

const OWNED = ['leads', 'audits', 'outreach', 'savedSearches', 'suppressions', 'activityLogs', 'usage'];

/**
 * Deletes the account and its private data. Payment records are retained in anonymised form because
 * financial records may need to be kept; they hold no notes, drafts or lead data.
 */
export const POST = route({ auth: 'user', rate: { name: 'delete-account', limit: 3, windowSec: 3600 } }, async ({ req, user }) => {
  await parseJson(req, schema);
  // Require a recent sign-in for this destructive action.
  if (Date.now() / 1000 - user.authTimeSec > 15 * 60) throw Errors.forbidden('Sign in again, then retry within 15 minutes.');
  const db = adminDb();
  for (const name of OWNED) {
    for (;;) {
      const snap = await db.collection(name).where('ownerId', '==', user.uid).limit(300).get();
      if (snap.empty) break;
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  const pays = await db.collection('payments').where('uid', '==', user.uid).get();
  const batch = db.batch();
  pays.docs.forEach((d) => batch.update(d.ref, { uid: `deleted:${user.uid.slice(0, 6)}`, anonymisedAt: new Date() }));
  batch.delete(db.collection('subscriptions').doc(user.uid));
  batch.delete(db.collection('users').doc(user.uid));
  await batch.commit();
  await adminAuth().deleteUser(user.uid);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
});
