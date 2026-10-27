import { describe, expect, it } from 'vitest';
import { computeScore, SCORE_NOTE, type ScoreInput } from '@/lib/scoring';
import type { Finding } from '@/lib/types';

const NOW = Date.UTC(2026, 9, 25);
const iso = (daysAgo: number) => new Date(NOW - daysAgo * 86_400_000).toISOString();

function f(over: Partial<Finding>): Finding {
  return { id: 'x', check: 'x', result: 'fail', severity: 'high', evidence: 'e', whyItMatters: 'w', recommendation: 'r', basis: 'measured', checkedAt: iso(0), services: [], ...over };
}

const base: ScoreInput = {
  findings: null,
  opportunityServices: [],
  userServices: [],
  contact: { email: false, phone: false, website: false },
  dataDate: { lastVerifiedAt: null, retrievedAt: iso(1) },
  buyingSignal: null,
  nowMs: NOW,
};

describe('computeScore', () => {
  it('explains every factor and labels the score as an estimate', () => {
    const s = computeScore(base);
    expect(s.factors).toHaveLength(5);
    for (const x of s.factors) expect(x.explanation.length).toBeGreaterThan(10);
    expect(s.note).toBe(SCORE_NOTE);
    expect(s.note).toContain('not a probability');
    expect(s.max).toBe(100);
  });
  it('treats a missing audit as unknown, not as a negative or positive signal', () => {
    const w = computeScore(base).factors.find((x) => x.key === 'websiteIssue')!;
    expect(w.points).toBe(0);
    expect(w.level).toBe('unknown');
  });
  it('scores measured issues and caps the factor', () => {
    const many = Array.from({ length: 10 }, () => f({}));
    expect(computeScore({ ...base, findings: many }).factors.find((x) => x.key === 'websiteIssue')!.points).toBe(40);
  });
  it('ignores unavailable findings', () => {
    const w = computeScore({ ...base, findings: [f({ basis: 'unavailable', result: 'info' })] }).factors.find((x) => x.key === 'websiteIssue')!;
    expect(w.points).toBe(0);
  });
  it('rewards overlap with the services the user offers', () => {
    const s = computeScore({ ...base, findings: [f({})], opportunityServices: ['seo', 'performance'], userServices: ['seo'] });
    expect(s.factors.find((x) => x.key === 'serviceMatch')!.points).toBe(10);
  });
  it('caps freshness when the source gives no verification date', () => {
    expect(computeScore(base).factors.find((x) => x.key === 'freshness')!.points).toBe(5);
    const verified = computeScore({ ...base, dataDate: { lastVerifiedAt: iso(5), retrievedAt: iso(1) } });
    expect(verified.factors.find((x) => x.key === 'freshness')!.points).toBe(10);
    const old = computeScore({ ...base, dataDate: { lastVerifiedAt: iso(800), retrievedAt: iso(1) } });
    expect(old.factors.find((x) => x.key === 'freshness')!.points).toBe(0);
  });
  it('gives buying-signal points only when one is recorded', () => {
    expect(computeScore(base).factors.find((x) => x.key === 'buyingSignal')!.points).toBe(0);
    expect(computeScore({ ...base, buyingSignal: { kind: 'public request for proposals' } }).factors.find((x) => x.key === 'buyingSignal')!.points).toBe(15);
  });
  it('never exceeds its maximum', () => {
    const s = computeScore({ ...base, findings: Array.from({ length: 20 }, () => f({})), opportunityServices: ['a', 'b', 'c'], userServices: ['a', 'b', 'c'], contact: { email: true, phone: true, website: true }, dataDate: { lastVerifiedAt: iso(1), retrievedAt: iso(1) }, buyingSignal: { kind: 'rfp' } });
    expect(s.total).toBeLessThan(101);
    expect(s.total).toBe(s.factors.reduce((a, x) => a + x.points, 0));
  });
});
