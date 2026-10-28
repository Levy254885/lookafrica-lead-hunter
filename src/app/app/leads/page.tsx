import { LeadSearch } from '@/components/lead-search';
import { PageHeader } from '@/components/ui';
import { requireUserPage } from '@/lib/auth/session';
import { getEntitlements } from '@/lib/entitlements';
import { CATEGORY_BY_ID, COUNTRY_LABEL } from '@/lib/leads/catalog';
import { getProfile } from '@/lib/users';
import { getLeadAdapter } from '@/lib/sources';

export const metadata = { title: 'Find Leads' };

export default async function FindLeads({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUserPage();
  const sp = await searchParams;
  const [ent, profile] = await Promise.all([getEntitlements(user), getProfile(user.uid)]);
  const status = getLeadAdapter('osm')!.status();
  const country = sp.country && sp.country in COUNTRY_LABEL ? sp.country : profile.country;
  const category = sp.category && sp.category in CATEGORY_BY_ID ? sp.category : 'retail';
  return (
    <>
      <PageHeader title="Find Leads" description="Discover businesses from public sources. Every result shows where it came from and when it was retrieved." />
      <LeadSearch
        initial={{ country, city: (sp.city ?? '').slice(0, 60), category }}
        canSaveSearch={ent.plan.features.savedSearches}
        canFilterWebsite={ent.plan.features.advancedFilters}
        sourceOk={status.available}
        sourceReason={status.reason}
      />
    </>
  );
}
