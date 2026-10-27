import Link from 'next/link';
import { Check } from 'lucide-react';
import { formatKes, PLAN_IDS, type PlansDoc } from '@/lib/plans';

/** Compact comparison of the four plans: one row per plan, no cards. */
export function PlanTable({ doc, cta = 'signup' }: { doc: PlansDoc; cta?: 'signup' | 'none' }) {
  return (
    <div className="panel overflow-x-auto">
      <table className="tbl min-w-[40rem]">
        <caption className="sr-only">Plans and monthly allowances</caption>
        <thead>
          <tr>
            <th scope="col">Plan</th>
            <th scope="col">Price / month</th>
            <th scope="col">Leads</th>
            <th scope="col">Audits</th>
            <th scope="col">AI drafts</th>
            <th scope="col">Includes</th>
            {cta === 'signup' && <th scope="col"><span className="sr-only">Action</span></th>}
          </tr>
        </thead>
        <tbody>
          {PLAN_IDS.map((id) => {
            const p = doc.plans[id];
            return (
              <tr key={id}>
                <th scope="row" className="bg-transparent text-sm font-semibold text-ink">{p.name}</th>
                <td className="whitespace-nowrap tabular-nums">{formatKes(p.priceKes)}</td>
                <td className="tabular-nums">{p.quotas.leads.toLocaleString('en-KE')}</td>
                <td className="tabular-nums">{p.quotas.audits.toLocaleString('en-KE')}</td>
                <td className="tabular-nums">{id === 'agency' ? 'Higher' : p.quotas.drafts.toLocaleString('en-KE')}</td>
                <td className="text-muted">{p.highlights.slice(3).join('; ') || 'Basic pipeline'}</td>
                {cta === 'signup' && (
                  <td className="text-right">
                    <Link href={id === 'free' ? '/signup' : `/signup?plan=${id}`} className={`btn btn-sm ${id === 'pro' ? 'btn-primary' : ''}`}>
                      {id === 'free' ? 'Start free' : 'Choose'}
                    </Link>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Four-up plan summary used on the pricing page. */
export function PricingTable({ doc, cta = 'signup' }: { doc: PlansDoc; cta?: 'signup' | 'none' }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {PLAN_IDS.map((id) => {
        const p = doc.plans[id];
        return (
          <section key={id} aria-labelledby={`plan-${id}`} className="panel flex flex-col p-4">
            <h3 id={`plan-${id}`} className="text-sm font-semibold">{p.name}</h3>
            <p className="mt-1 text-xl font-semibold tracking-tight">
              {formatKes(p.priceKes)}
              <span className="ml-1 text-xs font-normal text-muted">/ month</span>
            </p>
            <ul className="mt-3 flex-1 space-y-1.5 text-sm">
              {p.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <Check size={14} className="mt-1 shrink-0 text-accent-fg" aria-hidden="true" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
            {cta === 'signup' && (
              <Link href={id === 'free' ? '/signup' : `/signup?plan=${id}`} className={`btn mt-4 ${id === 'pro' ? 'btn-primary' : ''}`}>
                {id === 'free' ? 'Start for free' : `Choose ${p.name}`}
              </Link>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function UsageRules() {
  return (
    <div className="panel mt-4 p-4 text-sm">
      <h3 className="font-semibold">What counts against your allowance</h3>
      <dl className="mt-2 grid gap-x-6 gap-y-2 md:grid-cols-3">
        <div>
          <dt className="font-medium">Lead record</dt>
          <dd className="text-muted">A new business saved to your workspace. Searching is free. Re-saving or restoring one is not counted again.</dd>
        </div>
        <div>
          <dt className="font-medium">Website audit</dt>
          <dd className="text-muted">One new audit run. The same address within 24 hours returns the existing report free. Audits that fail on our side are returned to you.</dd>
        </div>
        <div>
          <dt className="font-medium">AI-generated draft</dt>
          <dd className="text-muted">One draft written by the AI model. Template drafts and edits are free. A failed AI draft deducts nothing.</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-muted">Allowances reset on the first day of each calendar month (UTC). Prices and allowances are initial settings and may change with notice.</p>
    </div>
  );
}
