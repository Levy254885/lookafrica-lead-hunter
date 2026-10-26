import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { AuditReport } from '@/components/audit-report';
import { LeadWorkspace } from '@/components/lead-workspace';
import { EvidenceBadge, fmtDate, PageHeader } from '@/components/ui';
import { requireUserPage } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { getOwnedLead } from '@/lib/leads/service';
import { toPlain } from '@/lib/serialize';
import { getProfile } from '@/lib/users';
import { SERVICE_LABEL, type Finding, type LeadScore, type OpportunityIndicator } from '@/lib/types';
import { COUNTRY_LABEL } from '@/lib/leads/catalog';

export const metadata = { title: 'Lead' };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserPage();
  const { id } = await params;
  const found = await getOwnedLead(user.uid, id).catch(() => null);
  if (!found) notFound();
  const lead = toPlain<Record<string, any>>(found.data); // eslint-disable-line @typescript-eslint/no-explicit-any
  const db = adminDb();
  const [profile, auditSnap, draftSnap, actSnap] = await Promise.all([
    getProfile(user.uid),
    lead.latestAuditId ? db.collection('audits').doc(lead.latestAuditId).get() : Promise.resolve(null),
    db.collection('outreach').where('ownerId', '==', user.uid).where('leadId', '==', id).orderBy('createdAt', 'desc').limit(10).get(),
    db.collection('activityLogs').where('ownerId', '==', user.uid).where('leadId', '==', id).orderBy('createdAt', 'desc').limit(15).get(),
  ]);
  const audit = auditSnap?.exists && auditSnap.data()?.ownerId === user.uid ? toPlain<Record<string, any>>(auditSnap.data()) : null; // eslint-disable-line @typescript-eslint/no-explicit-any
  const drafts = draftSnap.docs.map((d) => ({ id: d.id, ...toPlain<{ subject: string; body: string; status: string; generator: string; createdAt: string; suppressed: boolean }>(d.data()) }));
  const acts = actSnap.docs.map((d) => ({ id: d.id, ...toPlain<{ summary: string; createdAt: string }>(d.data()) }));
  const score = lead.score as LeadScore;
  const opps = (lead.opportunities ?? []) as OpportunityIndicator[];
  const p = lead.provenance;

  return (
    <>
      <p className="mb-2 text-sm"><Link className="link" href="/app/pipeline">My Pipeline</Link> / Lead</p>
      <PageHeader title={lead.name} description={`${lead.categoryLabel} · ${lead.city || 'Location not stated'}${lead.country ? `, ${COUNTRY_LABEL[lead.country] ?? lead.country}` : ''}`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <LeadWorkspace
            leadId={id}
            website={lead.website}
            initial={{ status: lead.status, notes: lead.notes ?? '', tags: lead.tags ?? [], followUpAt: lead.followUpAt, archived: lead.archived === true, outcome: lead.outcome }}
            statuses={profile.pipelineStatuses}
            latestAuditId={lead.latestAuditId}
            userServices={profile.services}
            suggestedServices={opps.map((o) => o.service)}
            drafts={drafts}
          />

          <section className="panel" aria-labelledby="rep">
            <div className="panel-head"><h2 id="rep" className="panel-title">Latest audit report</h2>{audit && <Link className="link text-xs" href={`/app/audits/${lead.latestAuditId}`}>Open full report</Link>}</div>
            <div className="p-4">
              {audit && audit.status === 'completed' ? (
                <AuditReport findings={audit.findings as Finding[]} checkedAt={audit.checkedAt} />
              ) : (
                <p className="text-sm text-muted">No completed audit yet. Run one above to see measured findings.</p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="panel" aria-labelledby="prof">
            <div className="panel-head"><h2 id="prof" className="panel-title">Business profile</h2></div>
            <dl className="space-y-3 p-4 text-sm">
              <div><dt className="text-xs text-muted">Website</dt><dd>{lead.website ? <a className="link inline-flex items-center gap-1 break-all" href={lead.website} target="_blank" rel="noopener noreferrer nofollow">{lead.website}<ExternalLink size={12} aria-label="opens in a new tab" /></a> : 'None listed by the source'} <EvidenceBadge level={lead.website ? 'reported' : 'unknown'} /></dd></div>
              <div><dt className="text-xs text-muted">Phone</dt><dd>{lead.phone ?? 'None listed'} {lead.phone && <EvidenceBadge level="reported" />}</dd></div>
              <div><dt className="text-xs text-muted">Email</dt><dd className="break-all">{lead.email ?? 'None listed'} {lead.email && <EvidenceBadge level="reported" />}</dd></div>
              <div><dt className="text-xs text-muted">Address</dt><dd>{lead.address ?? 'Not stated'}</dd></div>
            </dl>
          </section>

          <section className="panel" aria-labelledby="src">
            <div className="panel-head"><h2 id="src" className="panel-title">Source and provenance</h2></div>
            <dl className="space-y-2 p-4 text-sm">
              <div><dt className="text-xs text-muted">Source</dt><dd><a className="link" href={p.sourceUrl} target="_blank" rel="noopener noreferrer">{p.sourceLabel}</a></dd></div>
              <div><dt className="text-xs text-muted">Retrieved</dt><dd>{fmtDate(p.retrievedAt, true)}</dd></div>
              <div><dt className="text-xs text-muted">Source last checked</dt><dd>{fmtDate(p.lastVerifiedAt)}</dd></div>
              <div><dt className="text-xs text-muted">Licence and attribution</dt><dd>{p.license}. {p.attribution}</dd></div>
            </dl>
          </section>

          <section className="panel" aria-labelledby="sc">
            <div className="panel-head"><h2 id="sc" className="panel-title">Priority estimate: {score.total}/{score.max}</h2></div>
            <ul className="divide-y divide-line">
              {score.factors.map((f) => (
                <li key={f.key} className="p-3 text-sm">
                  <div className="flex items-center justify-between gap-2"><span className="font-medium">{f.label}</span><span className="tabular-nums">{f.points}/{f.max}</span></div>
                  <p className="mt-1 text-xs text-muted">{f.explanation}</p>
                  <div className="mt-1"><EvidenceBadge level={f.level} /></div>
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-4 py-2 text-xs text-faint">{score.note}</p>
          </section>

          <section className="panel" aria-labelledby="opp">
            <div className="panel-head"><h2 id="opp" className="panel-title">Potential services to offer</h2></div>
            <div className="p-4 text-sm">
              {opps.length === 0 ? <p className="text-muted">None identified yet. Opportunities appear only when an audit measures a related problem.</p> : (
                <ul className="space-y-3">{opps.map((o) => (<li key={o.service}><p className="font-medium">{SERVICE_LABEL[o.service] ?? o.service} <EvidenceBadge level={o.level} /></p><p className="text-xs text-muted">{o.reason}</p></li>))}</ul>
              )}
            </div>
          </section>

          <section className="panel" aria-labelledby="hist">
            <div className="panel-head"><h2 id="hist" className="panel-title">Activity history</h2></div>
            {acts.length === 0 ? <p className="p-4 text-sm text-muted">No activity yet.</p> : (
              <ul className="divide-y divide-line">{acts.map((a) => (<li key={a.id} className="px-4 py-2 text-sm">{a.summary}<p className="text-xs text-faint">{fmtDate(a.createdAt, true)}</p></li>))}</ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
