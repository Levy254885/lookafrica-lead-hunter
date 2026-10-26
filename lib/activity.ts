import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';

export type ActivityType =
  | 'lead_saved'
  | 'lead_updated'
  | 'lead_status_changed'
  | 'lead_archived'
  | 'lead_restored'
  | 'audit_requested'
  | 'audit_completed'
  | 'draft_created'
  | 'draft_marked_sent'
  | 'search_run'
  | 'subscription_changed';

/**
 * Writes an activity log entry. Retention: 365 days (configure a Firestore TTL policy on `expiresAt`).
 * Summaries are short human-readable strings; never place secrets or full message bodies in `meta`.
 */
export async function logActivity(
  ownerId: string,
  entry: { type: ActivityType; summary: string; leadId?: string | null; meta?: Record<string, unknown> },
): Promise<void> {
  try {
    await adminDb()
      .collection('activityLogs')
      .add({
        ownerId,
        type: entry.type,
        summary: entry.summary.slice(0, 300),
        leadId: entry.leadId ?? null,
        meta: entry.meta ?? {},
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 365 * 86_400_000),
      });
  } catch {
    // Activity logging must never break the user-facing action.
  }
}
