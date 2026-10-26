import { Alert, fmtDate, PageHeader } from '@/components/ui';
import { AdminReconcile } from '@/components/admin-reconcile';
import { adminDb } from '@/lib/firebase/admin';
import { allSourceStatuses } from '@/lib/sources';
import { loadPlans } from '@/lib/entitlements';
import { pesapalConfigured } from '@/lib/payments/pesapal';
import { formatKes, PLAN_IDS } from '@/lib/plans';
import { toPlain } from '@/lib/serialize';

export const metadata = { title: 'Admin' };

/**
 * Operator console. Authorization is enforced by the admin layout (verified custom claim) and again by
 * every admin API route. It shows aggregates and operational records; it does not display private lead
 * notes, drafts or pipelines.
 */
export default async function Admin() {
  const db = adminDb();
  const [plans, subs, failedAudits, payments, events, errors] = await Promise.all([
    loadPlans(),
    db.collection('subscriptions').where('status', '==', 'active').count().get(),
    db.collection('audits').where('status', '==', 'failed').orderBy('createdAt', 'desc').limit(10).get(),
    db.collection('payments').orderBy('createdAt', 'desc').limit(15).get(),
    db.collection('webhookEvents').orderBy('receivedAt', 'desc').limit(10).get(),
    db.collection('payments').where('lastRejection', '!=', null).limit(10).get(),
  ]);
  const sources = allSourceStatuses();
  const pay = payments.docs.map((d) => ({ id: d.id, ...toPlain<{ planId: string; amountKes: number; status: string; createdAt: string; provider: string }>(d.data()) }));
  const ev = events.docs.map((d) => ({ id: d.id, ...toPlain<{ outcome: string; notificationType: string; receivedAt: string }>(d.data()) }));
  const fa = failedAudits.docs.map((d) => ({ id: d.id, ...toPlain<{ host: string; createdAt: string; error: { code: string } | null }>(d.data()) }));

  return (
    <>
      <PageHeader title="Admin" description="Operations overview. Aggregates and technical records only." />
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="panel p-4"><p className="text-xs text-muted">Active paid subscriptions</p><p className="text-2xl font-semibold">{subs.data().count}</p></div>
          <div className="panel p-4"><p className="text-xs text-muted">Payments provider</p><p className="text-sm font-medium">{pesapalConfigured() ? `Pesapal (${process.env.PESAPAL_ENV ?? 'sandbox'})` : 'Not configured'}</p></div>
          <div className="panel p-4"><p className="text-xs text-muted">Payment rejections (amount/currency/reference mismatch)</p><p className="text-2xl font-semibold">{errors.size}</p></div>
        </div>

        <section className="panel" aria-labelledby="src">
          <div className="panel-head"><h2 id="src" className="panel-title">Data sources and integrations</h2></div>
          <div className="overflow-x-auto"><table className="tbl min-w-[40rem]">
            <thead><tr><th scope="col">Source</th><th scope="col">Kind</th><th scope="col">Status</th><th scope="col">Notes</th></tr></thead>
            <tbody>{sources.map((s) => (
              <tr key={s.id}><td>{s.label}</td><td>{s.kind}</td><td><span className={`badge ${s.available ? 'badge-ok' : 'badge-warn'}`}>{s.available ? 'available' : 'unavailable'}</span></td><td className="text-xs text-muted">{s.reason ?? s.quota}</td></tr>
            ))}</tbody>
          </table></div>
        </section>

        <section className="panel" aria-labelledby="pln">
          <div className="panel-head"><h2 id="pln" className="panel-title">Plan configuration (read from systemConfig/plans, defaults if unset)</h2></div>
          <div className="overflow-x-auto"><table className="tbl min-w-[36rem]">
            <thead><tr><th scope="col">Plan</th><th scope="col">Price</th><th scope="col">Leads</th><th scope="col">Audits</th><th scope="col">Drafts</th></tr></thead>
            <tbody>{PLAN_IDS.map((id) => plans.plans[id]).map((p) => (<tr key={p.id}><td>{p.name}</td><td>{formatKes(p.priceKes)}</td><td>{p.quotas.leads}</td><td>{p.quotas.audits}</td><td>{p.quotas.drafts}</td></tr>))}</tbody>
          </table></div>
          <p className="border-t border-line px-4 py-2 text-xs text-faint">Grace {plans.graceDays} days · period {plans.periodDays} days. Update through PUT /api/admin/plans (validated, audit logged).</p>
        </section>

        <section className="panel" aria-labelledby="pay">
          <div className="panel-head"><h2 id="pay" className="panel-title">Recent payments</h2></div>
          <div className="overflow-x-auto"><table className="tbl min-w-[36rem]">
            <thead><tr><th scope="col">Payment</th><th scope="col">Plan</th><th scope="col">Amount</th><th scope="col">Status</th><th scope="col">Created</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
            <tbody>{pay.map((p) => (<tr key={p.id}><td className="font-mono text-xs">{p.id.slice(0, 8)}</td><td>{p.planId}</td><td>{formatKes(p.amountKes)}</td><td><span className="badge">{p.status}</span></td><td className="text-xs">{fmtDate(p.createdAt, true)}</td><td>{p.status === 'initiated' && <AdminReconcile paymentId={p.id} />}</td></tr>))}</tbody>
          </table></div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel" aria-labelledby="ev">
            <div className="panel-head"><h2 id="ev" className="panel-title">Payment notifications</h2></div>
            {ev.length === 0 ? <p className="p-4 text-sm text-muted">None received.</p> : <ul className="divide-y divide-line">{ev.map((e) => (<li key={e.id} className="px-4 py-2 text-sm">{e.notificationType} → {e.outcome}<p className="text-xs text-faint">{fmtDate(e.receivedAt, true)}</p></li>))}</ul>}
          </section>
          <section className="panel" aria-labelledby="fa">
            <div className="panel-head"><h2 id="fa" className="panel-title">Failed audits</h2></div>
            {fa.length === 0 ? <p className="p-4 text-sm text-muted">None.</p> : <ul className="divide-y divide-line">{fa.map((a) => (<li key={a.id} className="px-4 py-2 text-sm">{a.host}<p className="text-xs text-faint">{a.error?.code ?? 'failed'} · {fmtDate(a.createdAt, true)}</p></li>))}</ul>}
          </section>
        </div>
        <Alert kind="info">Not yet built: duplicate-detection review, abuse-report queue, per-user usage drill-down and a plan-editing form. See PROGRESS.md.</Alert>
      </div>
    </>
  );
}
