import type { PlanConfig, PlansDoc } from '@/lib/plans';
import type { FeatureKey, PlanId, UsageKind } from '@/lib/types';

/**
 * Pure entitlement logic. No I/O, so it is fully unit-testable.
 * The Firestore-backed service in entitlements.ts composes these functions.
 */

export type StoredSubscriptionStatus = 'pending' | 'active' | 'canceled' | 'past_due' | 'expired';

/** Subscription document shape after Timestamps have been converted to epoch milliseconds. */
export interface SubscriptionRecord {
  planId: PlanId;
  status: StoredSubscriptionStatus;
  currentPeriodStartMs: number | null;
  currentPeriodEndMs: number | null;
  cancelAtPeriodEnd: boolean;
}

export type EffectiveStatus = 'free' | 'active' | 'grace' | 'expired';

export interface PlanState {
  /** Plan whose entitlements apply right now. */
  planId: PlanId;
  status: EffectiveStatus;
  /** The paid plan on record, even if it has lapsed (used for messaging). */
  recordedPlanId: PlanId;
  periodEndMs: number | null;
  graceEndMs: number | null;
  cancelAtPeriodEnd: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Decide which plan applies at `nowMs`.
 *
 * - No subscription, a free subscription, or a pending (unpaid) one gives the free plan.
 * - A paid period that has not ended gives the paid plan, including when renewal was canceled.
 * - After the period ends, paid access continues for `graceDays` and is flagged as grace.
 * - After grace, the free plan applies and the status is "expired".
 *
 * Status is derived from timestamps that only verified payment events can write; the stored
 * `status` field alone never grants access.
 */
export function resolvePlanState(
  sub: SubscriptionRecord | null,
  nowMs: number,
  graceDays: number,
): PlanState {
  const free: PlanState = {
    planId: 'free',
    status: 'free',
    recordedPlanId: 'free',
    periodEndMs: null,
    graceEndMs: null,
    cancelAtPeriodEnd: false,
  };
  if (!sub || sub.planId === 'free' || sub.status === 'pending') return free;
  if (sub.currentPeriodEndMs === null) return free;

  const periodEnd = sub.currentPeriodEndMs;
  const graceEnd = periodEnd + graceDays * DAY_MS;
  const base = {
    recordedPlanId: sub.planId,
    periodEndMs: periodEnd,
    graceEndMs: graceEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  };

  if (nowMs <= periodEnd) return { ...base, planId: sub.planId, status: 'active' };
  // A canceled subscription gets no grace period: the user chose to stop.
  if (sub.status !== 'canceled' && !sub.cancelAtPeriodEnd && nowMs <= graceEnd) {
    return { ...base, planId: sub.planId, status: 'grace' };
  }
  return { ...base, planId: 'free', status: 'expired' };
}

export interface Entitlements {
  state: PlanState;
  plan: PlanConfig;
  period: string;
  quotas: Record<UsageKind, number>;
  used: Record<UsageKind, number>;
  remaining: Record<UsageKind, number>;
  emailVerified: boolean;
}

/** Usage period key: calendar month in UTC, for example "2026-10". */
export function usagePeriodKey(nowMs: number): string {
  const d = new Date(nowMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function usagePeriodStartMs(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

export function buildEntitlements(args: {
  state: PlanState;
  plans: PlansDoc;
  used: Partial<Record<UsageKind, number>>;
  nowMs: number;
  emailVerified: boolean;
}): Entitlements {
  const plan = args.plans.plans[args.state.planId];
  const used: Record<UsageKind, number> = {
    leads: args.used.leads ?? 0,
    audits: args.used.audits ?? 0,
    drafts: args.used.drafts ?? 0,
  };
  const quotas = plan.quotas;
  const remaining: Record<UsageKind, number> = {
    leads: Math.max(0, quotas.leads - used.leads),
    audits: Math.max(0, quotas.audits - used.audits),
    drafts: Math.max(0, quotas.drafts - used.drafts),
  };
  return {
    state: args.state,
    plan,
    period: usagePeriodKey(args.nowMs),
    quotas,
    used,
    remaining,
    emailVerified: args.emailVerified,
  };
}

export type Decision =
  | { allowed: true }
  | { allowed: false; code: 'email_not_verified' | 'quota_exceeded' | 'feature_unavailable'; message: string };

export function canUseFeature(ent: Entitlements, feature: FeatureKey): Decision {
  if (ent.plan.features[feature]) return { allowed: true };
  return {
    allowed: false,
    code: 'feature_unavailable',
    message: `This feature is not included in the ${ent.plan.name} plan.`,
  };
}

/** Whether `amount` units of `kind` can be consumed given the snapshot in `ent`. */
export function canConsume(ent: Entitlements, kind: UsageKind, amount = 1): Decision {
  if (!ent.emailVerified) {
    return {
      allowed: false,
      code: 'email_not_verified',
      message: 'Verify your email address to use this feature.',
    };
  }
  if (ent.remaining[kind] < amount) {
    return {
      allowed: false,
      code: 'quota_exceeded',
      message: `You have reached the monthly ${kind === 'drafts' ? 'AI draft' : kind === 'audits' ? 'website audit' : 'lead record'} limit for the ${ent.plan.name} plan.`,
    };
  }
  return { allowed: true };
}

/**
 * Outcome of the atomic reservation step, evaluated against the freshly read usage counter.
 * Shared by the Firestore transaction and the unit tests so both use the same arithmetic.
 */
export function evaluateReservation(
  currentUsed: number,
  limit: number,
  amount: number,
): { ok: true; next: number } | { ok: false } {
  if (amount <= 0) return { ok: true, next: currentUsed };
  if (currentUsed + amount > limit) return { ok: false };
  return { ok: true, next: currentUsed + amount };
}

export type UpgradeDecision =
  | { allowed: true; mode: 'new' | 'renewal' | 'upgrade' }
  | { allowed: false; message: string };

/**
 * Checkout rules:
 * - Same plan: renewal, extends the current period.
 * - Higher plan during an active period: immediate upgrade, new period starts now, no proration.
 * - Lower plan during an active period: not allowed; subscribe to it when the current period ends.
 */
export function evaluateCheckout(
  state: PlanState,
  target: PlanConfig,
  plans: PlansDoc,
): UpgradeDecision {
  if (target.priceKes <= 0) return { allowed: false, message: 'The Free plan does not require payment.' };
  if (state.status === 'free' || state.status === 'expired') return { allowed: true, mode: 'new' };
  const current = plans.plans[state.recordedPlanId];
  if (target.id === current.id) return { allowed: true, mode: 'renewal' };
  if (target.rank > current.rank) return { allowed: true, mode: 'upgrade' };
  if (state.status === 'grace') return { allowed: true, mode: 'new' };
  return {
    allowed: false,
    message: `You are on ${current.name} until your current period ends. To move to ${target.name}, wait until the period ends and subscribe then.`,
  };
}
