import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { Errors } from '@/lib/errors';
import { logActivity } from '@/lib/activity';
import { evaluateCheckout, resolvePlanState } from '@/lib/entitlements-core';
import { getSubscription, loadPlans } from '@/lib/entitlements';
import { errorFields, log } from '@/lib/logger';
import { createOrder, getTransactionStatus, pesapalConfigured } from '@/lib/payments/pesapal';
import { computePeriod, verifyAgainstExpected, type ExpectedPayment } from '@/lib/payments/verify-core';
import { PLAN_IDS } from '@/lib/plans';
import { toMs } from '@/lib/serialize';
import type { PlanId, SessionUser } from '@/lib/types';

/**
 * Provider-neutral payment operations. Today the only provider is Pesapal; the functions here are
 * the seam where another provider (for example Flutterwave or a direct Daraja integration) plugs in:
 * createCheckout, verifyAndApply (verify transaction + process webhook), cancel, reconcile.
 */

export async function createCheckout(user: SessionUser, planId: PlanId): Promise<{ paymentId: string; redirectUrl: string }> {
  if (!PLAN_IDS.includes(planId)) throw Errors.badRequest('Unknown plan.');
  if (!user.emailVerified) throw Errors.forbidden('Verify your email address before subscribing.');
  if (!pesapalConfigured()) {
    throw Errors.unavailable('payments_not_configured', 'Payments are not configured on this deployment yet.');
  }

  const [plans, sub] = await Promise.all([loadPlans(), getSubscription(user.uid)]);
  const target = plans.plans[planId];
  const state = resolvePlanState(sub, Date.now(), plans.graceDays);
  const decision = evaluateCheckout(state, target, plans);
  if (!decision.allowed) throw Errors.conflict(decision.message);

  const db = adminDb();
  const ref = db.collection('payments').doc();
  await ref.set({
    uid: user.uid,
    provider: 'pesapal',
    planId,
    mode: decision.mode,
    amountKes: target.priceKes,
    currency: 'KES',
    status: 'initiated',
    orderTrackingId: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  try {
    const order = await createOrder({
      merchantReference: ref.id,
      amountKes: target.priceKes,
      description: `LOOK AFRICA Lead Hunter ${target.name} plan`,
      callbackUrl: `${process.env.APP_URL}/app/billing?payment=${ref.id}`,
      email: user.email ?? '',
      accountNumber: user.uid,
    });
    await ref.update({ orderTrackingId: order.orderTrackingId, updatedAt: FieldValue.serverTimestamp() });
    return { paymentId: ref.id, redirectUrl: order.redirectUrl };
  } catch (err) {
    log('error', 'checkout_create_failed', errorFields(err));
    await ref.update({ status: 'failed', failureReason: 'checkout_creation_failed', updatedAt: FieldValue.serverTimestamp() });
    throw Errors.unavailable('payment_provider_error', 'The payment provider could not start the checkout. Please try again.');
  }
}

export type ApplyOutcome = 'activated' | 'already_processed' | 'pending' | 'failed' | 'reversed' | 'rejected' | 'unknown_payment';

/**
 * Verifies a payment with the provider and, only if it checks out, applies the entitlement.
 * Called from the IPN endpoint, from the billing page when the user returns, and from reconciliation.
 * It is safe to call repeatedly: the transaction on the payment document makes activation idempotent.
 *
 * `trigger` and the tracking id from the browser or an IPN are treated as untrusted lookups only.
 */
export async function verifyAndApply(orderTrackingId: string, trigger: 'ipn' | 'return' | 'reconcile'): Promise<ApplyOutcome> {
  const db = adminDb();
  const found = await db.collection('payments').where('orderTrackingId', '==', orderTrackingId).limit(1).get();
  if (found.empty) {
    log('warn', 'payment_unknown_tracking_id', { trigger });
    return 'unknown_payment';
  }
  const paymentRef = found.docs[0].ref;
  const pre = found.docs[0].data();
  if (pre.status === 'completed') return 'already_processed';

  let tx;
  try {
    tx = await getTransactionStatus(orderTrackingId);
  } catch (err) {
    log('error', 'payment_status_lookup_failed', { trigger, ...errorFields(err) });
    throw err;
  }

  const plans = await loadPlans();
  const outcome = await db.runTransaction(async (t) => {
    const paySnap = await t.get(paymentRef);
    const pay = paySnap.data()!;
    if (pay.status === 'completed') return { result: 'already_processed' as ApplyOutcome };

    const expected: ExpectedPayment = {
      paymentId: paySnap.id,
      uid: pay.uid,
      planId: pay.planId,
      amountKes: pay.amountKes,
      currency: 'KES',
      orderTrackingId: pay.orderTrackingId ?? null,
      status: pay.status,
    };
    const verdict = verifyAgainstExpected(expected, tx, orderTrackingId);

    if (verdict.outcome === 'pending') return { result: 'pending' as ApplyOutcome };
    if (verdict.outcome === 'rejected') {
      t.update(paymentRef, { lastRejection: verdict.reason, updatedAt: FieldValue.serverTimestamp() });
      return { result: 'rejected' as ApplyOutcome, reason: verdict.reason };
    }
    if (verdict.outcome === 'failed') {
      t.update(paymentRef, { status: 'failed', failureReason: verdict.reason, updatedAt: FieldValue.serverTimestamp() });
      return { result: 'failed' as ApplyOutcome, uid: pay.uid, planId: pay.planId as PlanId };
    }
    if (verdict.outcome === 'reversed') {
      t.update(paymentRef, { status: 'reversed', updatedAt: FieldValue.serverTimestamp() });
      return { result: 'reversed' as ApplyOutcome };
    }

    // Verified complete: compute the new period and write both documents atomically.
    const subRef = db.collection('subscriptions').doc(pay.uid);
    const subSnap = await t.get(subRef);
    const nowMs = Date.now();
    const { startMs, endMs } = computePeriod({
      mode: pay.mode,
      nowMs,
      periodDays: plans.periodDays,
      currentPeriodEndMs: toMs(subSnap.data()?.currentPeriodEnd),
    });
    t.set(
      subRef,
      {
        uid: pay.uid,
        planId: pay.planId,
        status: 'active',
        currentPeriodStart: Timestamp.fromMillis(startMs),
        currentPeriodEnd: Timestamp.fromMillis(endMs),
        cancelAtPeriodEnd: false,
        lastPaymentId: paySnap.id,
        provider: 'pesapal',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    t.update(paymentRef, {
      status: 'completed',
      confirmationCode: tx.confirmationCode,
      paymentMethod: tx.paymentMethod,
      verifiedAt: FieldValue.serverTimestamp(),
      verifiedVia: trigger,
      periodStart: Timestamp.fromMillis(startMs),
      periodEnd: Timestamp.fromMillis(endMs),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { result: 'activated' as ApplyOutcome, uid: pay.uid, planId: pay.planId as PlanId };
  });

  if (outcome.result === 'activated' && 'uid' in outcome) {
    await logActivity(outcome.uid as string, { type: 'subscription_changed', summary: `Payment confirmed. ${outcome.planId} plan is active.` });
  }
  if (outcome.result === 'rejected') {
    log('warn', 'payment_verification_rejected', { paymentId: paymentRef.id, reason: (outcome as { reason?: string }).reason, trigger });
  }
  return outcome.result;
}

/** Records receipt of an IPN for audit purposes. Contains no secrets or personal data. */
export async function recordWebhookEvent(orderTrackingId: string, notificationType: string, outcome: ApplyOutcome): Promise<void> {
  try {
    await adminDb().collection('webhookEvents').add({
      provider: 'pesapal',
      orderTrackingId,
      notificationType,
      outcome,
      receivedAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 180 * 86_400_000),
    });
  } catch {
    // Event logging must not make the IPN fail.
  }
}

/**
 * Cancels renewal. Because M-Pesa and most local methods are paid manually each period, there is no
 * provider-side subscription to cancel for them; access simply continues to the end of the paid period.
 * Card recurring schedules, if the user opted in on Pesapal's page, are managed by the link Pesapal emails them.
 */
export async function cancelSubscription(user: SessionUser): Promise<void> {
  const ref = adminDb().collection('subscriptions').doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.planId === 'free' || snap.data()?.status !== 'active') {
    throw Errors.conflict('There is no active paid subscription to cancel.');
  }
  await ref.update({ cancelAtPeriodEnd: true, canceledAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  await logActivity(user.uid, { type: 'subscription_changed', summary: 'Renewal canceled. Paid access continues until the period ends.' });
}

export async function resumeSubscription(user: SessionUser): Promise<void> {
  const ref = adminDb().collection('subscriptions').doc(user.uid);
  const snap = await ref.get();
  const endMs = toMs(snap.data()?.currentPeriodEnd);
  if (!snap.exists || !endMs || endMs < Date.now()) throw Errors.conflict('This subscription has already ended. Choose a plan to subscribe again.');
  await ref.update({ cancelAtPeriodEnd: false, updatedAt: FieldValue.serverTimestamp() });
}

/** Re-verifies recent unfinished payments with the provider. Run by the scheduled job and by admins. */
export async function reconcilePayments(): Promise<{ checked: number; activated: number }> {
  const since = Timestamp.fromMillis(Date.now() - 3 * 86_400_000);
  const snap = await adminDb().collection('payments').where('status', '==', 'initiated').where('createdAt', '>=', since).limit(50).get();
  let activated = 0;
  let checked = 0;
  for (const d of snap.docs) {
    const id = d.data().orderTrackingId as string | null;
    if (!id) continue;
    checked++;
    try {
      if ((await verifyAndApply(id, 'reconcile')) === 'activated') activated++;
    } catch {
      // Provider unreachable for this one; it will be retried on the next run.
    }
  }
  return { checked, activated };
}
