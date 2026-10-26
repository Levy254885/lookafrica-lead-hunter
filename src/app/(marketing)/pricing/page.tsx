import type { Metadata } from 'next';
import { MarketingShell } from '@/components/marketing/chrome';
import { PricingTable, UsageRules } from '@/components/marketing/pricing';
import { loadPlans } from '@/lib/entitlements';
import { formatKes, PLAN_IDS } from '@/lib/plans';

export const metadata: Metadata = { title: 'Pricing' };
export const dynamic = 'force-dynamic';

const rows: { label: string; render: (p: Awaited<ReturnType<typeof loadPlans>>['plans']['free']) => string }[] = [
  { label: 'Price per month', render: (p) => formatKes(p.priceKes) },
  { label: 'Lead records per month', render: (p) => p.quotas.leads.toLocaleString('en-KE') },
  { label: 'Website audits per month', render: (p) => p.quotas.audits.toLocaleString('en-KE') },
  { label: 'AI-generated drafts per month', render: (p) => p.quotas.drafts.toLocaleString('en-KE') },
  { label: 'Saved searches', render: (p) => (p.features.savedSearches ? 'Yes' : 'No') },
  { label: 'CSV export', render: (p) => (p.features.csvExport ? 'Yes' : 'No') },
  { label: 'Advanced filters', render: (p) => (p.features.advancedFilters ? 'Yes' : 'No') },
  { label: 'Project alerts', render: (p) => (p.features.projectAlerts ? 'Planned' : 'No') },
  { label: 'Automated discovery and scoring', render: (p) => (p.features.autoDiscovery ? 'Planned' : 'No') },
  { label: 'Team workspace and shared pipeline', render: (p) => (p.features.teamWorkspace ? 'Planned' : 'No') },
  { label: 'Automated outreach sending', render: () => 'Not offered' },
];

export default async function PricingPage() {
  const doc = await loadPlans();
  return (
    <MarketingShell>
      <div className="container-page py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
        <p className="mt-2 max-w-prose text-sm text-muted">Four plans in Kenyan shillings. Allowances are monthly and enforced on our servers.</p>
        <div className="mt-8"><PricingTable doc={doc} /></div>

        <h2 className="mt-14 text-lg font-semibold">Compare plans</h2>
        <div className="panel mt-4 overflow-x-auto">
          <table className="tbl min-w-[40rem]">
            <thead>
              <tr>
                <th scope="col">Feature</th>
                {PLAN_IDS.map((id) => <th key={id} scope="col">{doc.plans[id].name}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row" className="bg-transparent font-normal text-ink">{r.label}</th>
                  {PLAN_IDS.map((id) => <td key={id}>{r.render(doc.plans[id])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <UsageRules />

        <h2 className="mt-14 text-lg font-semibold">Billing rules</h2>
        <ul className="mt-3 max-w-prose list-disc space-y-2 pl-5 text-sm text-muted">
          <li>Payments are processed by Pesapal (M-Pesa and cards). We never see or store card details.</li>
          <li>M-Pesa payments are per period and do not renew by themselves. We will remind you before your period ends. Card payments may offer recurring billing on Pesapal&apos;s page.</li>
          <li>Your plan changes only after our server has confirmed the payment with Pesapal.</li>
          <li>Upgrading starts a new {doc.periodDays}-day period immediately; the unused part of the previous period is not prorated. Moving to a lower plan is possible when the current period ends.</li>
          <li>If a paid period lapses you have {doc.graceDays} days of grace, then the account returns to Free limits. Your data is kept.</li>
          <li>Cancelling stops renewal and keeps paid access until the end of the paid period.</li>
        </ul>
      </div>
    </MarketingShell>
  );
}
