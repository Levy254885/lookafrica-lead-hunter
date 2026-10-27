import { CancelControls, CheckoutButton, PaymentReturn } from '@/components/billing-client';
import { Alert, fmtDate, Meter, PageHeader } from '@/components/ui';
import { requireUserPage } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { evaluateCheckout } from '@/lib/entitlements-core';
import { getEntitlements, loadPlans } from '@/lib/entitlements';
import { pesapalConfigured } from '@/lib/payments/pesapal';
import { formatKes, PLAN_IDS } from '@/lib/plans';
import { toPlain } from '@/lib/serialize';

export const metadata = { title: 'Usage and Billing' };
export const dynamic = 'force-dynamic';

const STATE_TEXT = {
  free: { label: 'Free', cls: '' },
  active: { label: 'Active', cls: 'badge-ok' },
  grace: { label: 'Payment overdue (grace period)', cls: 'badge-warn' },
  expired: { label: 'Expired', cls: 'badge-bad' },
} as const;

export default async function Billing({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUserPage();
  const sp = await searchParams;
  const [ent, plans] = await Promise.all([getEntitlements(user), loadPlans()]);
  const st = ent.state;
  const paySnap = await adminDb().collection('payments').where('uid', '==', user.uid).orderBy('createdAt', 'desc').limit(20).get();
  const payments = paySnap.docs.map((d) => ({ id: d.id, ...toPlain<{ planId: string; amountKes: number; status: string; createdAt: string; paymentMethod: string | null; confirmationCode: string | null }>(d.data()) }));
  const configured = pesapalConfigured();
  const paymentParam = sp.payment && /^[A-Za-z0-9]{8,64}$/.test(sp.payment) ? sp.payment : null;
  const iso = (ms: number | null) => (ms ? new Date(ms).toISOString() : null);
  const meta = STATE_TEXT[st.status];

  return (
    <>
      <PageHeader title="Usage and Billing" description="Your plan, this month's usage, and payment history." />
      <div className="space-y-6">
        {paymentParam && <PaymentReturn paymentId={paymentParam} />}
        {!configured && <Alert kind="warn">Payments are not configured on this deployment, so upgrading is unavailable. The operator must set the Pesapal variables (see docs/PAYMENTS.md).</Alert>}
        {st.status === 'grace' && <Alert kind="warn">Your {plans.plans[st.recordedPlanId].name} period ended {fmtDate(iso(st.periodEndMs))}. Paid features stay on until {fmtDate(iso(st.graceEndMs))}. Pay below to continue.</Alert>}
        {st.status === 'expired' && <Alert kind="bad">Your {plans.plans[st.recordedPlanId].name} plan has ended and the account is on Free limits. Your data is kept. Choose a plan to continue.</Alert>}

        <section className="panel" aria-labelledby="cur">
          <div className="panel-head">
            <h2 id="cur" className="panel-title">Current plan: {ent.plan.name}</h2>
            <span className={`badge ${meta.cls}`}>{meta.label}</span>
          </div>
          <div className="grid gap-6 p-4 md:grid-cols-2">
            <div className="space-y-3">
              <Meter label="Lead records" used={ent.used.leads} quota={ent.quotas.leads} />
              <Meter label="Website audits" used={ent.used.audits} quota={ent.quotas.audits} />
              <Meter label="AI-generated drafts" used={ent.used.drafts} quota={ent.quotas.drafts} />
              <p className="text-xs text-faint">Usage period {ent.period}. Resets on the first day of the month (UTC).</p>
            </div>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-xs text-muted">Price</dt><dd>{formatKes(ent.plan.priceKes)} per month</dd></div>
              {st.periodEndMs && <div><dt className="text-xs text-muted">{st.cancelAtPeriodEnd ? 'Access ends' : 'Paid until'}</dt><dd>{fmtDate(iso(st.periodEndMs), true)}</dd></div>}
              {st.status === 'active' && (
                <div>
                  <dt className="text-xs text-muted">Renewal</dt>
                  <dd>{st.cancelAtPeriodEnd ? 'Canceled. Access continues until the date above.' : 'Not automatic for M-Pesa. Pay again before the date above to extend.'}</dd>
                </div>
              )}
              {st.status === 'active' && <CancelControls cancelAtPeriodEnd={st.cancelAtPeriodEnd} />}
            </dl>
          </div>
        </section>

        <section aria-labelledby="chg">
          <h2 id="chg" className="mb-3 text-sm font-semibold">Change plan</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {PLAN_IDS.filter((id) => id !== 'free').map((id) => {
              const p = plans.plans[id];
              const d = evaluateCheckout(st, p, plans);
              const label = !d.allowed ? p.name : d.mode === 'renewal' ? `Extend ${p.name}` : d.mode === 'upgrade' ? `Upgrade to ${p.name}` : `Choose ${p.name}`;
              return (
                <div key={id} className={`panel p-4 ${sp.plan === id ? 'ring-2 ring-accent' : ''}`}>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-xl font-semibold">{formatKes(p.priceKes)}<span className="text-sm font-normal text-muted"> / {plans.periodDays} days</span></p>
                  <ul className="my-3 space-y-1 text-xs text-muted">{p.highlights.slice(0, 3).map((h) => <li key={h}>{h}</li>)}</ul>
                  <CheckoutButton planId={id} label={label} disabled={!configured || !user.emailVerified || !d.allowed} disabledReason={!user.emailVerified ? 'Verify your email first.' : !d.allowed ? d.message : undefined} />
                  {d.allowed && d.mode === 'upgrade' && <p className="hint">Starts a new {plans.periodDays}-day period now. The unused part of your current period is not prorated.</p>}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-faint">Pay with M-Pesa or card through Pesapal. Your plan changes only after the payment is confirmed with Pesapal.</p>
        </section>

        <section className="panel" aria-labelledby="hist">
          <div className="panel-head"><h2 id="hist" className="panel-title">Billing history</h2></div>
          {payments.length === 0 ? <p className="p-4 text-sm text-muted">No payments yet.</p> : (
            <div className="overflow-x-auto">
              <table className="tbl min-w-[36rem]">
                <thead><tr><th scope="col">Date</th><th scope="col">Plan</th><th scope="col">Amount</th><th scope="col">Method</th><th scope="col">Status</th></tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="text-xs">{fmtDate(p.createdAt, true)}</td>
                      <td>{plans.plans[p.planId as keyof typeof plans.plans]?.name ?? p.planId}</td>
                      <td>{formatKes(p.amountKes)}</td>
                      <td className="text-xs text-muted">{p.paymentMethod ?? 'Not available'}{p.confirmationCode ? ` · ${p.confirmationCode}` : ''}</td>
                      <td><span className={`badge ${p.status === 'completed' ? 'badge-ok' : p.status === 'failed' || p.status === 'reversed' ? 'badge-bad' : ''}`}>{p.status === 'initiated' ? 'awaiting confirmation' : p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
