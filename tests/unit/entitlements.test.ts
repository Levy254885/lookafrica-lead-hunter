import { describe, expect, it } from 'vitest';
import {
  buildEntitlements,
  canConsume,
  canUseFeature,
  evaluateCheckout,
  evaluateReservation,
  resolvePlanState,
  usagePeriodKey,
  type SubscriptionRecord,
} from '@/lib/entitlements-core';
import { DEFAULT_PLANS_DOC } from '@/lib/plans';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 25, 12);

function sub(over: Partial<SubscriptionRecord> = {}): SubscriptionRecord {
  return { planId: 'pro', status: 'active', currentPeriodStartMs: NOW - 10 * DAY, currentPeriodEndMs: NOW + 20 * DAY, cancelAtPeriodEnd: false, ...over };
}

describe('resolvePlanState', () => {
  it('gives Free with no subscription', () => {
    expect(resolvePlanState(null, NOW, 3).planId).toBe('free');
  });
  it('does not grant a paid plan for a pending subscription', () => {
    expect(resolvePlanState(sub({ status: 'pending' }), NOW, 3).planId).toBe('free');
  });
  it('does not grant a paid plan when there is no period end', () => {
    expect(resolvePlanState(sub({ currentPeriodEndMs: null }), NOW, 3).planId).toBe('free');
  });
  it('grants the paid plan during an active period', () => {
    const s = resolvePlanState(sub(), NOW, 3);
    expect(s.planId).toBe('pro');
    expect(s.status).toBe('active');
  });
  it('keeps paid access during grace, then expires', () => {
    const ended = sub({ currentPeriodEndMs: NOW - 1 * DAY });
    expect(resolvePlanState(ended, NOW, 3).status).toBe('grace');
    expect(resolvePlanState(ended, NOW, 3).planId).toBe('pro');
    const long = sub({ currentPeriodEndMs: NOW - 5 * DAY });
    expect(resolvePlanState(long, NOW, 3).status).toBe('expired');
    expect(resolvePlanState(long, NOW, 3).planId).toBe('free');
  });
  it('gives no grace to a canceled subscription once the period ends', () => {
    const s = resolvePlanState(sub({ cancelAtPeriodEnd: true, currentPeriodEndMs: NOW - 1 * DAY }), NOW, 3);
    expect(s.planId).toBe('free');
    expect(s.status).toBe('expired');
  });
  it('keeps access to the end of the period after cancelling renewal', () => {
    expect(resolvePlanState(sub({ cancelAtPeriodEnd: true }), NOW, 3).planId).toBe('pro');
  });
});

describe('quota decisions', () => {
  const state = resolvePlanState(null, NOW, 3);
  const ent = (used: Partial<Record<'leads' | 'audits' | 'drafts', number>>, verified = true) =>
    buildEntitlements({ state, plans: DEFAULT_PLANS_DOC, used, nowMs: NOW, emailVerified: verified });

  it('allows use within the Free quota', () => {
    expect(canConsume(ent({ leads: 9 }), 'leads').allowed).toBe(true);
  });
  it('blocks at the Free quota of 10 leads', () => {
    const d = canConsume(ent({ leads: 10 }), 'leads');
    expect(d.allowed).toBe(false);
  });
  it('blocks unverified emails', () => {
    const d = canConsume(ent({}, false), 'audits');
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe('email_not_verified');
  });
  it('reports remaining usage and never goes negative', () => {
    expect(ent({ audits: 5 }).remaining.audits).toBe(0);
    expect(ent({ audits: 1 }).remaining.audits).toBe(2);
  });
  it('blocks features outside the plan', () => {
    expect(canUseFeature(ent({}), 'csvExport').allowed).toBe(false);
  });
});

describe('evaluateReservation (atomic counter arithmetic)', () => {
  it('never exceeds the limit under many sequential claims', () => {
    let used = 0;
    let granted = 0;
    for (let i = 0; i < 50; i++) {
      const r = evaluateReservation(used, 10, 1);
      if (r.ok) {
        used = r.next;
        granted++;
      }
    }
    expect(granted).toBe(10);
    expect(used).toBe(10);
  });
  it('rejects a multi-unit claim that would pass the limit', () => {
    expect(evaluateReservation(9, 10, 2).ok).toBe(false);
  });
});

describe('usagePeriodKey', () => {
  it('uses the UTC calendar month', () => {
    expect(usagePeriodKey(Date.UTC(2026, 0, 31, 23, 59))).toBe('2026-01');
    expect(usagePeriodKey(Date.UTC(2026, 11, 1, 0, 0))).toBe('2026-12');
  });
});

describe('evaluateCheckout', () => {
  const plans = DEFAULT_PLANS_DOC;
  it('rejects paying for Free', () => {
    expect(evaluateCheckout(resolvePlanState(null, NOW, 3), plans.plans.free, plans).allowed).toBe(false);
  });
  it('treats a Free user buying Starter as a new subscription', () => {
    const d = evaluateCheckout(resolvePlanState(null, NOW, 3), plans.plans.starter, plans);
    expect(d.allowed && d.mode).toBe('new');
  });
  it('treats the same plan as a renewal and a higher plan as an upgrade', () => {
    const st = resolvePlanState(sub(), NOW, 3);
    const same = evaluateCheckout(st, plans.plans.pro, plans);
    const up = evaluateCheckout(st, plans.plans.agency, plans);
    expect(same.allowed && same.mode).toBe('renewal');
    expect(up.allowed && up.mode).toBe('upgrade');
  });
  it('blocks a downgrade during an active period', () => {
    expect(evaluateCheckout(resolvePlanState(sub(), NOW, 3), plans.plans.starter, plans).allowed).toBe(false);
  });
});
