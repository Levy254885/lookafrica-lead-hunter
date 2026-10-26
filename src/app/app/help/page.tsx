import { HelpContent } from '@/components/help-content';
import { PageHeader } from '@/components/ui';

export const metadata = { title: 'Help' };

export default function Help() {
  return (
    <>
      <PageHeader title="Help" description="How the product works and how to read what it shows you." />
      <div className="max-w-3xl"><HelpContent /></div>
    </>
  );
}
