import { describe, expect, it } from 'vitest';
import { DEFAULT_PLANS, DEFAULT_PLANS_DOC, parsePlansDoc } from '@/lib/plans';

describe('default plan configuration', () => {
  it('preserves the specified prices', () => {
    expect(DEFAULT_PLANS.free.priceKes).toBe(0);
    expect(DEFAULT_PLANS.starter.priceKes).toBe(500);
    expect(DEFAULT_PLANS.pro.priceKes).toBe(1500);
    expect(DEFAULT_PLANS.agency.priceKes).toBe(4000);
  });
  it('preserves the specified quotas', () => {
    expect(DEFAULT_PLANS.free.quotas).toEqual({ leads: 10, audits: 3, drafts: 5 });
    expect(DEFAULT_PLANS.starter.quotas).toEqual({ leads: 100, audits: 30, drafts: 50 });
    expect(DEFAULT_PLANS.pro.quotas).toEqual({ leads: 500, audits: 150, drafts: 200 });
    expect(DEFAULT_PLANS.agency.quotas.leads).toBe(2000);
    expect(DEFAULT_PLANS.agency.quotas.audits).toBe(500);
  });
  it('never offers automated outreach sending', () => {
    for (const p of Object.values(DEFAULT_PLANS)) expect(p.features.outreachSending).toBe(false);
  });
  it('validates its own default document', () => {
    expect(parsePlansDoc(DEFAULT_PLANS_DOC)).toBeTruthy();
  });
  it('rejects malformed configuration', () => {
    const bad = JSON.parse(JSON.stringify(DEFAULT_PLANS_DOC));
    bad.plans.pro.priceKes = -5;
    expect(parsePlansDoc(bad)).toBeNull();
    const swapped = JSON.parse(JSON.stringify(DEFAULT_PLANS_DOC));
    swapped.plans.pro.id = 'agency';
    expect(parsePlansDoc(swapped)).toBeNull();
    expect(parsePlansDoc({ nope: true })).toBeNull();
  });
});
