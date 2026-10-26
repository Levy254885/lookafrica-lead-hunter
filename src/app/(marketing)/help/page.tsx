import type { Metadata } from 'next';
import { MarketingShell } from '@/components/marketing/chrome';
import { HelpContent } from '@/components/help-content';

export const metadata: Metadata = { title: 'Help' };

export default function PublicHelp() {
  return (
    <MarketingShell>
      <div className="container-page max-w-3xl py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Help and documentation</h1>
        <HelpContent />
      </div>
    </MarketingShell>
  );
}
