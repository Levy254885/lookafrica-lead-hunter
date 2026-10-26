import Link from 'next/link';
import { Check } from 'lucide-react';
import { formatKes, PLAN_IDS, type PlansDoc } from '@/lib/plans';

export function PricingTable({ doc, cta = 'signup' }: { doc: PlansDoc; cta?: 'signup' | 'none' }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PLAN_IDS.map((id) => {
        const p = doc.plans[id];
        return (
          <section key={id} aria-labelledby={`plan-${id}`} className="panel flex flex-col p-5">
            <h3 id={`plan-${id}`} className="text-sm font-semibold">
              {p.name}
            </h3>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {formatKes(p.priceKes)}
              <span className="ml-1 text-sm font-normal text-muted">/ month</span>
            </p>
            <ul className="mt-4 flex-1 space-y-2 text-sm">
              {p.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
            {cta === 'signup' && (
              <Link href={id === 'free' ? '/signup' : `/signup?plan=${id}`} className={`btn mt-5 ${id === 'pro' ? 'btn-primary' : ''}`}>
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
    <div className="panel mt-6 p-5 text-sm">
      <h3 className="font-semibold">What counts against your allowance</h3>
      <dl className="mt-3 grid gap-x-8 gap-y-3 md:grid-cols-3">
        <div>
          <dt className="font-medium">Lead record</dt>
          <dd className="mt-1 text-muted">A new business saved to your workspace. Searching is free. Saving a business you already saved, or restoring an archived one, is not counted again.</dd>
        </div>
        <div>
          <dt className="font-medium">Website audit</dt>
          <dd className="mt-1 text-muted">One new audit run. Re-requesting the same address within 24 hours returns the existing report at no charge. Audits that fail on our side are returned to your allowance.</dd>
        </div>
        <div>
          <dt className="font-medium">AI-generated draft</dt>
          <dd className="mt-1 text-muted">One draft written by the AI model. Template drafts and edits to existing drafts are free. If AI drafting fails, nothing is deducted.</dd>
        </div>
      </dl>
      <p className="mt-4 text-muted">Allowances reset on the first day of each calendar month (UTC). Prices and allowances are initial settings and may change with notice.</p>
    </div>
  );
}
