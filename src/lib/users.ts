import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { DEFAULT_PIPELINE, type PipelineStatus, type SessionUser } from '@/lib/types';

export interface Profile {
  uid: string;
  email: string | null;
  displayName: string;
  country: string;
  services: string[];
  pipelineStatuses: PipelineStatus[];
}

function isAlreadyExists(err: unknown): boolean {
  return (err as { code?: number | string })?.code === 6 || (err as { code?: string })?.code === 'already-exists';
}

/**
 * Creates the user document on first sign-in. Plan, role and admin status are deliberately not
 * stored here: plans live in `subscriptions` (server-written) and admin is a custom auth claim.
 */
export async function ensureUserDoc(user: SessionUser, displayNameHint?: string): Promise<void> {
  const ref = adminDb().collection('users').doc(user.uid);
  try {
    await ref.create({
      uid: user.uid,
      email: user.email,
      displayName: (displayNameHint ?? user.email?.split('@')[0] ?? 'New user').slice(0, 80),
      country: 'KE',
      services: [],
      pipelineStatuses: DEFAULT_PIPELINE,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    if (!isAlreadyExists(err)) throw err;
  }
}

export async function getProfile(uid: string): Promise<Profile> {
  const snap = await adminDb().collection('users').doc(uid).get();
  const d = snap.data() ?? {};
  return {
    uid,
    email: (d.email as string) ?? null,
    displayName: (d.displayName as string) ?? 'User',
    country: (d.country as string) ?? 'KE',
    services: Array.isArray(d.services) ? (d.services as string[]) : [],
    pipelineStatuses:
      Array.isArray(d.pipelineStatuses) && d.pipelineStatuses.length > 0
        ? (d.pipelineStatuses as PipelineStatus[])
        : DEFAULT_PIPELINE,
  };
}
