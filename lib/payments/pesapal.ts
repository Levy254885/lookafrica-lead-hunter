/**
 * Pesapal API 3.0 client.
 *
 * Endpoint paths and field names below follow Pesapal's published API 3.0 JSON integration guide
 * as understood when this was written. They have NOT been exercised against a live or sandbox
 * account from this repository, because no credentials were available. Run the sandbox checklist
 * in docs/PAYMENTS.md before trusting this in production.
 *
 * Facts confirmed from Pesapal's recurring-payments page: recurring charges apply to cards only
 * (Visa and Mastercard); no mobile-money recurring support is documented. Pesapal's IPN carries
 * limited data, and the merchant must call GetTransactionStatus for the authoritative result.
 */

export const PESAPAL_BASE = {
  sandbox: 'https://cybqa.pesapal.com/pesapalv3',
  live: 'https://pay.pesapal.com/v3',
} as const;

export function pesapalConfigured(): boolean {
  return Boolean(process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET && process.env.PESAPAL_IPN_ID && process.env.APP_URL);
}

function base(): string {
  return process.env.PESAPAL_ENV === 'live' ? PESAPAL_BASE.live : PESAPAL_BASE.sandbox;
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function pesapalFetch(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<unknown> {
  const headers: Record<string, string> = { accept: 'application/json', 'content-type': 'application/json' };
  if (init.auth !== false) headers.authorization = `Bearer ${await getToken()}`;
  const res = await fetch(`${base()}${path}`, { ...init, headers, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`pesapal_http_${res.status}`);
  return res.json();
}

async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.token;
  const json = (await pesapalFetch('/api/Auth/RequestToken', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
  })) as { token?: string; expiryDate?: string; error?: unknown };
  if (!json.token) throw new Error('pesapal_no_token');
  const exp = json.expiryDate ? Date.parse(json.expiryDate) : Date.now() + 4 * 60_000;
  tokenCache = { token: json.token, expiresAt: Number.isNaN(exp) ? Date.now() + 4 * 60_000 : exp };
  return json.token;
}

export interface CreateOrderInput {
  merchantReference: string;
  amountKes: number;
  description: string;
  callbackUrl: string;
  email: string;
  /** Optional subscription pre-fill for card recurring payments. dd-MM-yyyy dates. */
  subscription?: { startDate: string; endDate: string; frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' };
  accountNumber?: string;
}

export async function createOrder(input: CreateOrderInput): Promise<{ orderTrackingId: string; redirectUrl: string }> {
  const json = (await pesapalFetch('/api/Transactions/SubmitOrderRequest', {
    method: 'POST',
    body: JSON.stringify({
      id: input.merchantReference,
      currency: 'KES',
      amount: input.amountKes,
      description: input.description.slice(0, 100),
      callback_url: input.callbackUrl,
      notification_id: process.env.PESAPAL_IPN_ID,
      account_number: input.accountNumber,
      billing_address: { email_address: input.email },
      ...(input.subscription
        ? {
            subscription_details: {
              start_date: input.subscription.startDate,
              end_date: input.subscription.endDate,
              frequency: input.subscription.frequency,
            },
          }
        : {}),
    }),
  })) as { order_tracking_id?: string; redirect_url?: string };
  if (!json.order_tracking_id || !json.redirect_url) throw new Error('pesapal_bad_order_response');
  return { orderTrackingId: json.order_tracking_id, redirectUrl: json.redirect_url };
}

export interface TransactionStatus {
  /** Pesapal status_code: 0 invalid, 1 completed, 2 failed, 3 reversed. Anything else is not final. */
  statusCode: number | null;
  paymentStatusDescription: string;
  amount: number | null;
  currency: string | null;
  merchantReference: string | null;
  confirmationCode: string | null;
  paymentMethod: string | null;
  createdDate: string | null;
}

export function parseTransactionStatus(json: Record<string, unknown>): TransactionStatus {
  const str = (v: unknown) => (typeof v === 'string' && v ? v : null);
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return {
    statusCode: num(json.status_code),
    paymentStatusDescription: str(json.payment_status_description) ?? 'UNKNOWN',
    amount: num(json.amount),
    currency: str(json.currency),
    merchantReference: str(json.merchant_reference),
    confirmationCode: str(json.confirmation_code),
    paymentMethod: str(json.payment_method),
    createdDate: str(json.created_date),
  };
}

export async function getTransactionStatus(orderTrackingId: string): Promise<TransactionStatus> {
  const json = (await pesapalFetch(`/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`)) as Record<string, unknown>;
  return parseTransactionStatus(json);
}
