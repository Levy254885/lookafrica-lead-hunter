import type { Metadata } from 'next';
import { MarketingShell } from '@/components/marketing/chrome';
import { Alert } from '@/components/ui';

export const metadata: Metadata = { title: 'Privacy policy' };

export default function Privacy() {
  return (
    <MarketingShell>
      <article className="container-page max-w-3xl space-y-4 py-14 text-sm leading-6">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy policy</h1>
        <Alert kind="warn">Draft for legal review. This text describes how the product is built. It has not been reviewed by a lawyer and must be reviewed against the Kenya Data Protection Act, 2019 and registration obligations with the Office of the Data Protection Commissioner before launch.</Alert>
        <h2 className="pt-4 text-lg font-semibold">Who we are</h2>
        <p>LOOK AFRICA GROUP LIMITED operates LOOK AFRICA Lead Hunter.</p>
        <h2 className="pt-4 text-lg font-semibold">What we collect from you</h2>
        <p>Your email address, display name, country and the services you offer; the leads, notes, tags, drafts and follow-up dates you create; the website addresses you audit; usage counts; and payment records (plan, amount, status and provider reference). Card and mobile-money credentials are handled by Pesapal and never reach us.</p>
        <h2 className="pt-4 text-lg font-semibold">Business information in lead results</h2>
        <p>Lead results come from public sources such as OpenStreetMap. They can include business names, addresses, and public contact details that contributors have published. We show the source with every record. Some records may relate to individuals who trade as sole proprietors. You are responsible for using contact details lawfully, including honouring opt-outs.</p>
        <h2 className="pt-4 text-lg font-semibold">How we use data</h2>
        <p>To provide the service, enforce plan limits, process payments, prevent abuse and fix problems. When you request an AI draft, the business name, category, city, website and selected audit findings are sent to the AI model provider to write the draft. We do not sell your data.</p>
        <h2 className="pt-4 text-lg font-semibold">Service providers</h2>
        <p>Google Firebase (authentication and database), Vercel (hosting), Pesapal (payments), Google PageSpeed Insights (audits), OpenStreetMap Overpass (lead discovery) and the AI model provider (drafts).</p>
        <h2 className="pt-4 text-lg font-semibold">Retention and deletion</h2>
        <p>Activity logs are kept for 365 days. Cached source records expire within days. You can delete your account in Settings, which removes your leads, audits, drafts, saved searches, suppression list, activity and usage records. Payment records are kept in anonymised form for financial record-keeping.</p>
        <h2 className="pt-4 text-lg font-semibold">Your rights</h2>
        <p>You can access, correct, export (CSV on paid plans) and delete your data. To make a request, use the contact page.</p>
      </article>
    </MarketingShell>
  );
}
