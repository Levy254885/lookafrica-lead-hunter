import 'server-only';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/errors';

/**
 * Fixed-window rate limiter backed by Firestore so the limit holds across serverless instances.
 * Documents carry an `expiresAt` field; configure a Firestore TTL policy on it (see docs/DEPLOYMENT.md).
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<void> {
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const safeKey = `${key}:${bucket}`.replace(/[/\s]/g, '_').slice(0, 300);
  const ref = adminDb().collection('rateLimits').doc(safeKey);
  const count = await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const next = (snap.exists ? (snap.data()?.count as number) : 0) + 1;
    tx.set(ref, {
      count: next,
      expiresAt: Timestamp.fromMillis((bucket + 2) * windowSec * 1000),
    });
    return next;
  });
  if (count > limit) {
    throw new ApiError(429, 'rate_limited', 'Too many requests. Please wait a moment and try again.');
  }
}
