import type { Metadata } from 'next';
import { MarketingShell } from '@/components/marketing/chrome';
import { Alert } from '@/components/ui';

export const metadata: Metadata = { title: 'Contact' };

export default function Contact() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <MarketingShell>
      <div className="container-page max-w-2xl space-y-4 py-6 text-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Contact</h1>
        {email ? (
          <p>
            For support, data requests and abuse reports, email{' '}
            <a className="link" href={`mailto:${email}`}>{email}</a>. Include the email address of your account.
          </p>
        ) : (
          <Alert kind="info">A public contact address has not been configured for this deployment. The operator should set NEXT_PUBLIC_CONTACT_EMAIL.</Alert>
        )}
        <p className="text-muted">We publish no office address or telephone number here.</p>
      </div>
    </MarketingShell>
  );
}
