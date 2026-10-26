import type { PlanId } from '@/lib/types';
import type { TransactionStatus } from '@/lib/payments/pesapal';

/**
 * Pure payment verification and period arithmetic, unit-tested without any I/O.
 * A payment may only activate a plan when every check passes against the provider's own answer.
 */

export interface ExpectedPayment {
  paymentId: string;
  uid: string;
  planId: PlanId;
  amountKes: number;
  currency: 'KES';
  orderTrackingId: string | null;
  status: 'initiated' | 'completed' | 'failed' | 'reversed';
}

export type VerifyResult =
  | { outcome: 'completed' }
  | { outcome: 'failed'; reason: string }
  | { outcome: 'reversed' }
  | { outcome: 'pending' }
  | { outcome: 'rejected'; reason: string };

export function verifyAgainstExpected(expected: ExpectedPayment, tx: TransactionStatus, orderTrackingId: string): VerifyResult {
  if (tx.merchantReference !== expected.paymentId) {
    return { outcome: 'rejected', reason: 'merchant_reference_mismatch' };
  }
  if (expected.orderTrackingId && expected.orderTrackingId !== orderTrackingId) {
    return { outcome: 'rejected', reason: 'tracking_id_mismatch' };
  }
  if (tx.statusCode === 1) {
    if (tx.currency !== expected.currency) return { outcome: 'rejected', reason: 'currency_mismatch' };
    // Compare in cents to avoid floating-point surprises.
    if (tx.amount === null || Math.round(tx.amount * 100) !== Math.round(expected.amountKes * 100)) {
      return { outcome: 'rejected', reason: 'amount_mismatch' };
    }
    return { outcome: 'completed' };
  }
  if (tx.statusCode === 2) return { outcome: 'failed', reason: tx.paymentStatusDescription.slice(0, 80) };
  if (tx.statusCode === 3) return { outcome: 'reversed' };
  return { outcome: 'pending' };
}

const DAY_MS = 86_400_000;

export interface PeriodInput {
  mode: 'new' | 'renewal' | 'upgrade';
  nowMs: number;
  periodDays: number;
  currentPeriodEndMs: number | null;
}

/**
 * - new / upgrade: a fresh period starting now. No proration is applied on upgrade; the unused part
 *   of the previous period is forfeited, and checkout says so.
 * - renewal: extends from the end of the current period if it has not ended, so paying early loses nothing.
 */
export function computePeriod(i: PeriodInput): { startMs: number; endMs: number } {
  if (i.mode === 'renewal' && i.currentPeriodEndMs !== null && i.currentPeriodEndMs > i.nowMs) {
    return { startMs: i.currentPeriodEndMs, endMs: i.currentPeriodEndMs + i.periodDays * DAY_MS };
  }
  return { startMs: i.nowMs, endMs: i.nowMs + i.periodDays * DAY_MS };
}
