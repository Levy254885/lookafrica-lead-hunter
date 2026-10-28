import { route } from '@/lib/api';
import { toCsv } from '@/lib/csv';
import { requireFeature } from '@/lib/entitlements';
import { listLeads } from '@/lib/leads/service';

export const GET = route({ auth: 'user', rate: { name: 'export', limit: 10, windowSec: 600 } }, async ({ user }) => {
  await requireFeature(user, 'csvExport');
  const leads = await listLeads(user.uid, { limit: 500 });
  const csv = toCsv(
    ['Name', 'Category', 'City', 'Website', 'Email', 'Phone', 'Status', 'Score', 'Tags', 'Follow-up', 'Source', 'Source URL', 'Retrieved', 'Attribution'],
    leads.map((l) => [l.name, l.categoryLabel, l.city, l.website, l.email, l.phone, l.status, `${l.score.total}/${l.score.max}`, l.tags, l.followUpAt, l.provenance.sourceLabel, l.provenance.sourceUrl, l.provenance.retrievedAt, l.provenance.attribution]),
  );
  return new Response(csv, {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="lookafrica-leads.csv"', 'cache-control': 'no-store' },
  });
});
