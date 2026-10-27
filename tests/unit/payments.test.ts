import { describe, expect, it } from 'vitest';
import { parseTransactionStatus, type TransactionStatus } from '@/lib/payments/pesapal';
import { computePeriod, verifyAgainstExpected, type ExpectedPayment } from '@/lib/payments/verify-core';

const expected: ExpectedPayment = { paymentId: 'pay123', uid: 'u1', planId: 'pro', amountKes: 1500, currency: 'KES', orderTrackingId: 'trk-1', status: 'initiated' };
const ok: TransactionStatus = { statusCode: 1, paymentStatusDescription: 'Completed', amount: 1500, currency: 'KES', merchantReference: 'pay123', confirmationCode: 'ABC', paymentMethod: 'MpesaKE', createdDate: null };

describe('verifyAgainstExpected', () => {
  it('accepts a completed payment that matches reference, amount and currency', () => {
    expect(verifyAgainstExpected(expected, ok, 'trk-1').outcome).toBe('completed');
  });
  it('rejects an amount mismatch (underpayment or tampering)', () => {
    expect(verifyAgainstExpected(expected, { ...ok, amount: 500 }, 'trk-1')).toEqual({ outcome: 'rejected', reason: 'amount_mismatch' });
    expect(verifyAgainstExpected(expected, { ...ok, amount: null }, 'trk-1').outcome).toBe('rejected');
  });
  it('rejects a currency mismatch', () => {
    expect(verifyAgainstExpected(expected, { ...ok, currency: 'USD' }, 'trk-1')).toEqual({ outcome: 'rejected', reason: 'currency_mismatch' });
  });
  it('rejects a payment for a different merchant reference', () => {
    expect(verifyAgainstExpected(expected, { ...ok, merchantReference: 'someone-else' }, 'trk-1').outcome).toBe('rejected');
  });
  it('rejects a tracking id that differs from the one stored', () => {
    expect(verifyAgainstExpected(expected, ok, 'trk-other').outcome).toBe('rejected');
  });
  it('maps failed, reversed and unfinished statuses without activating', () => {
    expect(verifyAgainstExpected(expected, { ...ok, statusCode: 2 }, 'trk-1').outcome).toBe('failed');
    expect(verifyAgainstExpected(expected, { ...ok, statusCode: 3 }, 'trk-1').outcome).toBe('reversed');
    expect(verifyAgainstExpected(expected, { ...ok, statusCode: 0 }, 'trk-1').outcome).toBe('pending');
    expect(verifyAgainstExpected(expected, { ...ok, statusCode: null }, 'trk-1').outcome).toBe('pending');
  });
  it('does not check amount for unfinished payments but still checks the reference', () => {
    expect(verifyAgainstExpected(expected, { ...ok, statusCode: 0, merchantReference: 'x' }, 'trk-1').outcome).toBe('rejected');
  });
});

describe('parseTransactionStatus', () => {
  it('parses a provider response defensively', () => {
    const t = parseTransactionStatus({ status_code: 1, payment_status_description: 'Completed', amount: 1500, currency: 'KES', merchant_reference: 'pay123' });
    expect(t.statusCode).toBe(1);
    expect(t.amount).toBe(1500);
    expect(t.confirmationCode).toBeNull();
  });
  it('turns wrongly typed fields into nulls instead of trusting them', () => {
    const t = parseTransactionStatus({ status_code: '1', amount: '1500', currency: 5 });
    expect(t.statusCode).toBeNull();
    expect(t.amount).toBeNull();
    expect(t.currency).toBeNull();
  });
});

describe('computePeriod', () => {
  const DAY = 86_400_000;
  const now = Date.UTC(2026, 9, 25);
  it('starts a new period now for a new subscription or upgrade', () => {
    expect(computePeriod({ mode: 'new', nowMs: now, periodDays: 30, currentPeriodEndMs: null })).toEqual({ startMs: now, endMs: now + 30 * DAY });
    expect(computePeriod({ mode: 'upgrade', nowMs: now, periodDays: 30, currentPeriodEndMs: now + 10 * DAY }).startMs).toBe(now);
  });
  it('extends from the current end when renewing early, so no paid time is lost', () => {
    const end = now + 10 * DAY;
    expect(computePeriod({ mode: 'renewal', nowMs: now, periodDays: 30, currentPeriodEndMs: end })).toEqual({ startMs: end, endMs: end + 30 * DAY });
  });
  it('starts now when renewing after the period ended', () => {
    expect(computePeriod({ mode: 'renewal', nowMs: now, periodDays: 30, currentPeriodEndMs: now - DAY }).startMs).toBe(now);
  });
});
