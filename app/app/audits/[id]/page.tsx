import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AuditReport, EvidenceLegend } from '@/components/audit-report';
import { AuditStatusPoller } from '@/components/audit-status';
import { Alert, fmtDate, PageHeader } from '@/components/ui';
import { requireUserPage } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { toPlain } from '@/lib/serialize';
import { SERVICE_LABEL, type Finding, type OpportunityIndicator } from '@/lib/types';
import type { PageSpeedResult } from '@/lib/audit/pagespeed';

export const metadata = { title: 'Audit report' };

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserPage();
  const { id } = await params;
  const snap = await adminDb().collection('audits').doc(id).get();
  if (!snap.exists || snap.data()?.ownerId !== user.uid) notFound();
  const a = toPlain<Record<string, any>>(snap.data()); // eslint-disable-line @typescript-eslint/no-explicit-any
  const ps = a.pagespeed as PageSpeedResult | null;
  const opps = (a.opportunities ?? []) as OpportunityIndicator[];

  return (
    <>
      <p className="mb-2 text-sm"><Link className="link" href="/app/audits">Website Audits</Link> / Report</p>
      <PageHeader title={a.host} description={a.finalUrl ? `Final address: ${a.finalUrl}` : a.url} actions={a.leadId ? <Link className="btn" href={`/app/leads/${a.leadId}`}>Open lead</Link> : undefined} />

      {(a.status === 'pending' || a.status === 'running') && <AuditStatusPoller auditId={id} status={a.status} />}
      {a.status === 'failed' && <Alert kind="bad">{a.error?.message ?? 'The audit failed.'}</Alert>}

      {a.status === 'completed' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            {[['Failures', a.summary.fail], ['Warnings', a.summary.warn], ['Passed', a.summary.pass], ['Unavailable', a.summary.unavailable]].map(([l, v]) => (
              <div key={String(l)} className="panel p-4"><p className="text-xs text-muted">{l}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{v}</p></div>
            ))}
          </div>

          {ps && (
            <section className="panel" aria-labelledby="psi">
              <div className="panel-head"><h2 id="psi" className="panel-title">PageSpeed Insights (mobile)</h2><span className="text-xs text-faint">Reported by Google {fmtDate(ps.fetchedAt, true)}</span></div>
              {ps.available && ps.scores ? (
                <dl className="grid gap-4 p-4 sm:grid-cols-4">
                  {([['Performance', ps.scores.performance], ['Accessibility', ps.scores.accessibility], ['SEO', ps.scores.seo], ['Best practices', ps.scores.bestPractices]] as const).map(([l, v]) => (
                    <div key={l}><dt className="text-xs text-muted">{l}</dt><dd className="text-xl font-semibold tabular-nums">{v ?? 'n/a'}{v !== null && <span className="text-xs font-normal text-faint">/100</span>}</dd></div>
                  ))}
                </dl>
              ) : (
                <div className="p-4"><Alert kind="warn">PageSpeed data is unavailable: {ps.reason}</Alert></div>
              )}
            </section>
          )}

          <section aria-labelledby="fnd">
            <h2 id="fnd" className="mb-2 text-sm font-semibold">Findings</h2>
            <div className="mb-3"><EvidenceLegend /></div>
            <AuditReport findings={a.findings as Finding[]} checkedAt={a.checkedAt} />
          </section>

          <section className="panel" aria-labelledby="ops">
            <div className="panel-head"><h2 id="ops" className="panel-title">Services these findings relate to</h2></div>
            <div className="p-4 text-sm">
              {opps.length === 0 ? <p className="text-muted">No measured warnings or failures, so no opportunities are indicated.</p> : (
                <ul className="space-y-2">{opps.map((o) => (<li key={o.service}><span className="font-medium">{SERVICE_LABEL[o.service] ?? o.service}</span><span className="text-muted"> — {o.reason}</span></li>))}</ul>
              )}
              <p className="mt-3 text-xs text-faint">A finding is a measured fact about one page at one time. Whether it is a good reason to contact the business is your judgement.</p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
