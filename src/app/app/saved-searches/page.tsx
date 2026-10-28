import Link from 'next/link';
import { Bookmark } from 'lucide-react';
import { DeleteSavedSearch } from '@/components/delete-saved-search';
import { EmptyState, fmtDate, PageHeader } from '@/components/ui';
import { requireUserPage } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { getEntitlements } from '@/lib/entitlements';
import { COUNTRY_LABEL } from '@/lib/leads/catalog';
import { toPlain } from '@/lib/serialize';

export const metadata = { title: 'Saved Searches' };

export default async function SavedSearches() {
  const user = await requireUserPage();
  const ent = await getEntitlements(user);
  const [saved, history] = await Promise.all([
    adminDb().collection('savedSearches').where('ownerId', '==', user.uid).where('saved', '==', true).orderBy('createdAt', 'desc').limit(50).get(),
    adminDb().collection('savedSearches').where('ownerId', '==', user.uid).where('saved', '==', false).orderBy('createdAt', 'desc').limit(20).get(),
  ]);
  type S = { name: string | null; params: { country: string; city: string; category: string }; resultCount: number | null; createdAt: string };
  const mk = (d: FirebaseFirestore.QueryDocumentSnapshot) => ({ id: d.id, ...toPlain<S>(d.data()) });
  const savedRows = saved.docs.map(mk);
  const hist = history.docs.map(mk);
  const href = (s: S) => `/app/leads?country=${s.params.country}&city=${encodeURIComponent(s.params.city)}&category=${s.params.category}`;
  return (
    <>
      <PageHeader title="Saved Searches" description="Searches you saved, and your recent search history." />
      <section className="panel" aria-labelledby="sv">
        <div className="panel-head"><h2 id="sv" className="panel-title">Saved</h2></div>
        {!ent.plan.features.savedSearches ? (
          <EmptyState icon={Bookmark} title="Saved searches need a paid plan" action={<Link className="btn" href="/app/billing">See plans</Link>}>Available on Starter and above. Your recent history below is always kept.</EmptyState>
        ) : savedRows.length === 0 ? (
          <EmptyState icon={Bookmark} title="Nothing saved yet">Run a search in Find Leads and use the bookmark button to save it.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {savedRows.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div><Link className="link font-medium" href={href(s)}>{s.name}</Link><p className="text-xs text-faint">{s.params.category} · {s.params.city}, {COUNTRY_LABEL[s.params.country]} · saved {fmtDate(s.createdAt)}</p></div>
                <DeleteSavedSearch id={s.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="panel mt-6" aria-labelledby="hs">
        <div className="panel-head"><h2 id="hs" className="panel-title">Recent history</h2></div>
        {hist.length === 0 ? <p className="p-4 text-sm text-muted">No searches yet.</p> : (
          <ul className="divide-y divide-line">
            {hist.map((s) => (<li key={s.id} className="px-4 py-2 text-sm"><Link className="hover:underline" href={href(s)}>{s.params.category} in {s.params.city}, {COUNTRY_LABEL[s.params.country]}</Link><p className="text-xs text-faint">{s.resultCount} results · {fmtDate(s.createdAt, true)}</p></li>))}
          </ul>
        )}
      </section>
    </>
  );
}
