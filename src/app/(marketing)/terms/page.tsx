import type { Metadata } from 'next';
import { MarketingShell } from '@/components/marketing/chrome';
import { Alert } from '@/components/ui';

export const metadata: Metadata = { title: 'Terms of service' };

export default function Terms() {
  return (
    <MarketingShell>
      <article className="container-page max-w-3xl space-y-4 py-6 text-sm leading-6">
        <h1 className="text-2xl font-semibold tracking-tight">Terms of service</h1>
        <Alert kind="warn">Draft for legal review. These terms describe intended product behaviour and have not been reviewed by a lawyer. Governing law, liability, refund and dispute clauses must be completed by counsel before launch.</Alert>
        <h2 className="pt-4 text-lg font-semibold">The service</h2>
        <p>LOOK AFRICA Lead Hunter helps you find and organise potential clients. It provides data from third-party sources and automated checks. We do not guarantee that any record is accurate, current or complete, or that any lead will become a client.</p>
        <h2 className="pt-4 text-lg font-semibold">Acceptable use</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Use contact information only in ways that comply with applicable law, including data protection and electronic-marketing rules.</li>
          <li>Honour requests to stop contact and keep your suppression list up to date.</li>
          <li>Do not audit websites you are not entitled to test with heavy traffic, and do not attempt to reach internal or private systems through the audit tool.</li>
          <li>Do not make false statements about a business. Statements in drafts must be supported by the evidence shown.</li>
          <li>Do not resell raw source data or attempt to bypass limits.</li>
        </ul>
        <h2 className="pt-4 text-lg font-semibold">Plans, payment and cancellation</h2>
        <p>Paid plans last 30 days from confirmed payment. Access changes only after payment is verified with the payment provider. Cancelling stops renewal; paid access continues until the period ends. Upgrades take effect on confirmation of payment and start a new period without proration. Refunds: to be defined by the operator.</p>
        <h2 className="pt-4 text-lg font-semibold">Data sources</h2>
        <p>Source data stays subject to its own licence. OpenStreetMap data is &copy; OpenStreetMap contributors under the Open Database Licence.</p>
        <h2 className="pt-4 text-lg font-semibold">Changes</h2>
        <p>Prices and allowances may change. We will give notice before a change affects an active paid period.</p>
      </article>
    </MarketingShell>
  );
}
