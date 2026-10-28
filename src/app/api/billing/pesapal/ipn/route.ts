import { NextResponse, type NextRequest } from 'next/server';
import { errorFields, log } from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';
import { recordWebhookEvent, verifyAndApply } from '@/lib/payments/service';

/**
 * Pesapal IPN endpoint. Pesapal does not sign IPNs, so nothing in this request is trusted: the
 * tracking id is only used to look up the payment, and activation depends entirely on the result of
 * Pesapal's GetTransactionStatus call checked against the amount, currency and reference we stored.
 * Replays are harmless because activation is idempotent.
 */
async function handle(req: NextRequest) {
  const url = new URL(req.url);
  const trackingId = url.searchParams.get('OrderTrackingId') ?? '';
  const type = url.searchParams.get('OrderNotificationType') ?? 'UNKNOWN';
  const reference = url.searchParams.get('OrderMerchantReference') ?? '';
  const reply = (status: 200 | 500) =>
    NextResponse.json({ orderNotificationType: type, orderTrackingId: trackingId, orderMerchantReference: reference, status });

  if (!/^[A-Za-z0-9-]{8,64}$/.test(trackingId)) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  try {
    await rateLimit(`ipn:${trackingId}`, 20, 300);
    const outcome = await verifyAndApply(trackingId, 'ipn');
    await recordWebhookEvent(trackingId, type, outcome);
    // 500 asks Pesapal to retry; use it only when the result is not yet final.
    return reply(outcome === 'pending' ? 500 : 200);
  } catch (err) {
    log('error', 'ipn_failed', errorFields(err));
    return reply(500);
  }
}

export const GET = handle;
export const POST = handle;
