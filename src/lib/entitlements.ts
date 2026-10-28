import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/errors';
import {
  buildEntitlements,
  canConsume,
  canUseFeature,
  evaluateReservation,
  resolvePlanState,
  usagePeriodKey,
  type Entitlements,
  type SubscriptionRecord,
} from '@/lib/entitlements-core';
import { DEFAULT_PLANS_DOC, parsePlansDoc, type PlansDoc } from '@/lib/plans';
import { toMs } from '@/lib/serialize';
import type { FeatureKey, SessionUser, UsageKind } from '@/lib/types';

/**
 * Central server-side entitlement service. Every paid or usage-limited action calls into this
 * module; nothing is decided from client-supplied values.
 */

let plansCache: { value: PlansDoc; at: number } | null = null;
const PLANS_TTL_MS = 60_000;

export async function loadPlans(): Promise<PlansDoc> {
  if (plansCache && Date.now() - plansCache.at < PLANS_TTL_MS) return plansCache.value;
  let value = DEFAULT_PLANS_DOC;
  try {
    const snap = await adminDb().collection('systemConfig').doc('plans').get();
    if (snap.exists) value = parsePlansDoc(snap.data()) ?? DEFAULT_PLANS_DOC;
  } catch {
    // Fall back to defaults when Firestore config is unreadable; quotas stay enforced.
  }
  plansCache = { value, at: Date.now() };
  return value;
}

export function invalidatePlansCache(): void {
  plansCache = null;
}

export function toSubscriptionRecord(data: Record<string, any> | undefined): SubscriptionRecord | null {
  if (!data) return null;
  return {
    planId: data.planId,
    status: data.status,
    currentPeriodStartMs: toMs(data.currentPeriodStart),
    currentPeriodEndMs: toMs(data.currentPeriodEnd),
    cancelAtPeriodEnd: data.cancelAtPeriodEnd === true,
  };
}

export async function getSubscription(uid: string): Promise<SubscriptionRecord | null> {
  const snap = await adminDb().collection('subscriptions').doc(uid).get();
  return toSubscriptionRecord(snap.data());
}

export function usageDocId(ownerId: string, period: string): string {
  return `${ownerId}_${period}`;
}

export async function getEntitlements(user: Pick<SessionUser, 'uid' | 'emailVerified'>): Promise<Entitlements> {
  const nowMs = Date.now();
  const [plans, sub, usageSnap] = await Promise.all([
    loadPlans(),
    getSubscription(user.uid),
    adminDb()
      .collection('usage')
      .doc(usageDocId(user.uid, usagePeriodKey(nowMs)))
      .get(),
  ]);
  const state = resolvePlanState(sub, nowMs, plans.graceDays);
  const usage = usageSnap.data() ?? {};
  return buildEntitlements({
    state,
    plans,
    used: { leads: usage.leads, audits: usage.audits, drafts: usage.drafts },
    nowMs,
    emailVerified: user.emailVerified,
  });
}

export async function requireFeature(user: SessionUser, feature: FeatureKey): Promise<Entitlements> {
  const ent = await getEntitlements(user);
  const decision = canUseFeature(ent, feature);
  if (!decision.allowed) throw new ApiError(403, decision.code, decision.message);
  return ent;
}

/**
 * Atomically reserves `amount` units of `kind`. The counter is read and written inside a Firestore
 * transaction, so concurrent requests cannot jointly exceed the quota.
 */
export async function reserveUsage(user: SessionUser, kind: UsageKind, amount = 1): Promise<Entitlements> {
  const ent = await getEntitlements(user);
  const pre = canConsume(ent, kind, amount);
  if (!pre.allowed) {
    throw new ApiError(pre.code === 'email_not_verified' ? 403 : 402, pre.code, pre.message);
  }
  const ref = adminDb().collection('usage').doc(usageDocId(user.uid, ent.period));
  const limit = ent.quotas[kind];
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = (snap.data()?.[kind] as number | undefined) ?? 0;
    const result = evaluateReservation(current, limit, amount);
    if (!result.ok) {
      throw new ApiError(402, 'quota_exceeded', `Monthly ${kind} limit reached for the ${ent.plan.name} plan.`);
    }
    tx.set(
      ref,
      { ownerId: user.uid, period: ent.period, [kind]: result.next, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  });
  return ent;
}

/** Returns previously reserved units, for example when an audit fails because of our own fault. */
export async function releaseUsage(ownerId: string, kind: UsageKind, amount = 1, period?: string): Promise<void> {
  const key = period ?? usagePeriodKey(Date.now());
  const ref = adminDb().collection('usage').doc(usageDocId(ownerId, key));
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const current = (snap.data()?.[kind] as number | undefined) ?? 0;
    tx.set(ref, { [kind]: Math.max(0, current - amount), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
}
