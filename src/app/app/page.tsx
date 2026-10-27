import Link from 'next/link';
import { CalendarClock, Gauge, Search, Telescope } from 'lucide-react';
import { fmtDate, EmptyState, Meter, PageHeader } from '@/components/ui';
import { adminDb } from '@/lib/firebase/admin';
import { requireUserPage } from '@/lib/auth/session';
import { getEntitlements } from '@/lib/entitlements';
import { usagePeriodStartMs } from '@/lib/entitlements-core';
import { countNewProjects } from '@/lib/projects/service';
import { toPlain } from '@/lib/serialize';
import { COUNTRY_LABEL } from '@/lib/leads/catalog';
import { Timestamp } from 'firebase-admin/firestore';

export const metadata = { title: 'Overview' };

export default async function Overview() {
  const user = await requireUserPage();
  const db = adminDb();
  const ent = await getEntitlements(user);
  const now = Date.now();
  const periodStart = Timestamp.fromMillis(usagePeriodStartMs(now));

  const [auditsDone, dueSnap, upcomingSnap, searchSnap, activitySnap, newProjects, leadTotal] = await Promise.all([
    db.collection('audits').where('ownerId', '==', user.uid).where('status', '==', 'completed').where('completedAt', '>=', periodStart).count().get(),
    db.collection('leads').where('ownerId', '==', user.uid).where('archived', '==', false).where('followUpAt', '<=', Timestamp.fromMillis(now)).count().get(),
    db.collection('leads').where('ownerId', '==', user.uid).where('archived', '==', false).where('followUpAt', '>', Timestamp.fromMillis(now)).orderBy('followUpAt', 'asc').limit(5).get(),
    db.collection('savedSearches').where('ownerId', '==', user.uid).where('saved', '==', false).orderBy('createdAt', 'desc').limit(5).get(),
    db.collection('activityLogs').where('ownerId', '==', user.uid).orderBy('createdAt', 'desc').limit(8).get(),
    countNewProjects(now - 7 * 86_400_000),
    db.collection('leads').where('ownerId', '==', user.uid).where('archived', '==', false).count().get(),
  ]);

  const searches = searchSnap.docs.map((d) => toPlain<{ params: { country: string; city: string; category: string }; resultCount: number; createdAt: string }>(d.data()));
  const activity = activitySnap.docs.map((d) => ({ id: d.id, ...toPlain<{ summary: string; createdAt: string; leadId: string | null }>(d.data()) }));
  const upcoming = upcomingSnap.docs.map((d) => ({ id: d.id, ...toPlain<{ name: string; followUpAt: string }>(d.data()) }));
  const dueCount = dueSnap.data().count;
  const isNew = leadTotal.data().count === 0 && auditsDone.data().count === 0;

  const stat = (label: string, value: number, hint: string) => (
    <div className="px-4 py-2.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-faint">{hint}</p>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Overview"
        description="What needs your attention, and where you stand this month."
        actions={
          <>
            <Link href="/app/leads" className="btn btn-primary"><Search size={16} aria-hidden="true" /> Find leads</Link>
            <Link href="/app/audits" className="btn"><Gauge size={16} aria-hidden="true" /> Audit a website</Link>
            <Link href="/app/projects" className="btn hidden sm:inline-flex"><Telescope size={16} aria-hidden="true" /> Projects</Link>
          </>
        }
      />

      {isNew && (
        <div className="panel mb-4">
          <EmptyState icon={Search} title="Your workspace is empty" action={<Link href="/app/settings" className="btn">Choose your services</Link>}>
            Start by choosing the services you offer in Settings, then run a search for businesses in your city. Searching is free; only saving a lead uses your monthly allowance.
          </EmptyState>
        </div>
      )}

      <div className="panel grid grid-cols-2 divide-line lg:grid-cols-4 lg:divide-x">
        {stat('Leads saved this month', ent.used.leads, `of ${ent.quotas.leads} allowed`)}
        {stat('Audits completed this month', auditsDone.data().count, `${ent.used.audits} of ${ent.quotas.audits} used`)}
        {stat('New project listings', newProjects, 'first seen in the last 7 days')}
        {stat('Follow-ups due', dueCount, 'leads with a follow-up date today or earlier')}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="panel lg:col-span-2" aria-labelledby="act">
          <div className="panel-head"><h2 id="act" className="panel-title">Recent activity</h2></div>
          {activity.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted">No activity yet. Actions like saving a lead or running an audit appear here.</p>
          ) : (
            <ul className="divide-y divide-line">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-2 text-sm">
                  {a.leadId ? <Link className="hover:underline" href={`/app/leads/${a.leadId}`}>{a.summary}</Link> : <span>{a.summary}</span>}
                  <time className="shrink-0 text-xs text-faint" dateTime={a.createdAt}>{fmtDate(a.createdAt, true)}</time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-4">
          <section className="panel" aria-labelledby="plan">
            <div className="panel-head">
              <h2 id="plan" className="panel-title">{ent.plan.name} plan</h2>
              <Link href="/app/billing" className="text-xs link">Manage</Link>
            </div>
            <div className="space-y-2.5 p-3">
              <Meter label="Lead records" used={ent.used.leads} quota={ent.quotas.leads} />
              <Meter label="Website audits" used={ent.used.audits} quota={ent.quotas.audits} />
              <Meter label="AI drafts" used={ent.used.drafts} quota={ent.quotas.drafts} />
              <p className="text-xs text-faint">Resets on the first day of each month (UTC).</p>
            </div>
          </section>

          <section className="panel" aria-labelledby="fu">
            <div className="panel-head"><h2 id="fu" className="panel-title">Upcoming follow-ups</h2></div>
            {upcoming.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted">None scheduled. Set a follow-up date on a lead.</p>
            ) : (
              <ul className="divide-y divide-line">
                {upcoming.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                    <Link className="truncate hover:underline" href={`/app/leads/${u.id}`}>{u.name}</Link>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted"><CalendarClock size={12} aria-hidden="true" />{fmtDate(u.followUpAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel" aria-labelledby="rs">
            <div className="panel-head"><h2 id="rs" className="panel-title">Recent searches</h2></div>
            {searches.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted">No searches yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {searches.map((s, i) => (
                  <li key={i} className="px-4 py-2 text-sm">
                    <Link className="hover:underline" href={`/app/leads?country=${s.params.country}&city=${encodeURIComponent(s.params.city)}&category=${s.params.category}`}>
                      {s.params.category} in {s.params.city}, {COUNTRY_LABEL[s.params.country] ?? s.params.country}
                    </Link>
                    <p className="text-xs text-faint">{s.resultCount} results · {fmtDate(s.createdAt, true)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
