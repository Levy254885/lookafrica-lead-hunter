'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Columns3, Download, Rows3 } from 'lucide-react';
import { Alert, fmtDate } from '@/components/ui';
import { api, ClientApiError } from '@/components/use-api';
import type { LeadRow } from '@/lib/leads/service';
import type { PipelineStatus } from '@/lib/types';

export function PipelineView({ leads, statuses, canExport, initialQuery = '' }: { leads: LeadRow[]; statuses: PipelineStatus[]; canExport: boolean; initialQuery?: string }) {
  const router = useRouter();
  const [view, setView] = useState<'table' | 'board'>('table');
  const [q, setQ] = useState(initialQuery);
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<'updated' | 'score' | 'followup'>('updated');
  const [err, setErr] = useState<string | null>(null);

  const label = (id: string) => statuses.find((s) => s.id === id)?.label ?? id;
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const out = leads.filter((l) => (!status || l.status === status) && (!t || `${l.name} ${l.city} ${l.tags.join(' ')}`.toLowerCase().includes(t)));
    out.sort((a, b) =>
      sort === 'score' ? b.score.total - a.score.total
      : sort === 'followup' ? (a.followUpAt ?? '9999').localeCompare(b.followUpAt ?? '9999')
      : (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
    return out;
  }, [leads, q, status, sort]);

  async function move(id: string, to: string) {
    setErr(null);
    try {
      await api(`/api/leads/${id}`, 'PATCH', { status: to });
      router.refresh();
    } catch (e) {
      setErr(e instanceof ClientApiError ? e.message : 'Could not move the lead.');
    }
  }

  const overdue = (l: LeadRow) => l.followUpAt && new Date(l.followUpAt).getTime() < Date.now();

  return (
    <div className="space-y-4">
      <div className="panel flex flex-wrap items-end gap-3 p-3">
        <div className="min-w-[12rem] flex-1">
          <label className="label" htmlFor="pq">Search</label>
          <input id="pq" className="input" placeholder="Name, city or tag" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="ps">Status</label>
          <select id="ps" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="po">Sort by</label>
          <select id="po" className="input" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="updated">Recently updated</option>
            <option value="score">Priority estimate</option>
            <option value="followup">Follow-up date</option>
          </select>
        </div>
        <div className="flex gap-1" role="group" aria-label="View">
          <button className={`btn btn-sm ${view === 'table' ? 'btn-primary' : ''}`} onClick={() => setView('table')} aria-pressed={view === 'table'}><Rows3 size={14} aria-hidden="true" /> Table</button>
          <button className={`btn btn-sm ${view === 'board' ? 'btn-primary' : ''}`} onClick={() => setView('board')} aria-pressed={view === 'board'}><Columns3 size={14} aria-hidden="true" /> Board</button>
        </div>
        {canExport ? (
          <a className="btn btn-sm" href="/api/leads/export"><Download size={14} aria-hidden="true" /> CSV</a>
        ) : (
          <span className="text-xs text-faint" title="Available on Starter and above">CSV export: Starter+</span>
        )}
      </div>
      {err && <Alert kind="bad">{err}</Alert>}

      {view === 'table' ? (
        <div className="panel overflow-x-auto">
          <table className="tbl min-w-[48rem]">
            <thead><tr><th scope="col">Lead</th><th scope="col">Status</th><th scope="col">Priority</th><th scope="col">Follow-up</th><th scope="col">Tags</th><th scope="col">Next step</th></tr></thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td><Link className="link font-medium" href={`/app/leads/${l.id}`}>{l.name}</Link><p className="text-xs text-faint">{l.categoryLabel} · {l.city}</p></td>
                  <td>
                    <select className="input h-8 w-auto text-xs" aria-label={`Status for ${l.name}`} value={l.status} onChange={(e) => move(l.id, e.target.value)}>
                      {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="tabular-nums">{l.score.total}<span className="text-xs text-faint">/{l.score.max}</span></td>
                  <td className={`text-xs ${overdue(l) ? 'font-medium text-danger' : ''}`}>{l.followUpAt ? fmtDate(l.followUpAt) : 'Not set'}{overdue(l) ? ' (overdue)' : ''}</td>
                  <td className="text-xs text-muted">{l.tags.join(', ') || 'None'}</td>
                  <td className="text-xs text-muted">{nextStep(l)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {statuses.map((s) => {
            const col = rows.filter((l) => l.status === s.id);
            return (
              <section key={s.id} aria-label={s.label} className="w-64 shrink-0 rounded-lg border border-line bg-subtle">
                <h3 className="flex justify-between border-b border-line px-3 py-2 text-xs font-semibold">{s.label}<span className="text-faint">{col.length}</span></h3>
                <ul className="space-y-2 p-2">
                  {col.map((l) => (
                    <li key={l.id} className="rounded border border-line bg-surface p-2.5 text-sm">
                      <Link className="font-medium hover:underline" href={`/app/leads/${l.id}`}>{l.name}</Link>
                      <p className="text-xs text-faint">{l.city} · {l.score.total}/{l.score.max}</p>
                      {l.followUpAt && <p className={`mt-1 text-xs ${overdue(l) ? 'text-danger' : 'text-muted'}`}>Follow up {fmtDate(l.followUpAt)}</p>}
                      <select className="input mt-2 h-7 text-xs" aria-label={`Move ${l.name}`} value={l.status} onChange={(e) => move(l.id, e.target.value)}>
                        {statuses.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                      </select>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <p className="text-xs text-faint">{rows.length} of {leads.length} leads shown. Status names: {statuses.map((s) => label(s.id)).join(', ')}.</p>
    </div>
  );
}

function nextStep(l: LeadRow): string {
  switch (l.status) {
    case 'new': return 'Review the business and run an audit.';
    case 'reviewed': return 'Decide whether it is a fit.';
    case 'qualified': return 'Create a draft and make contact.';
    case 'contacted': return 'Wait for a reply, then follow up.';
    case 'replied': return 'Propose a meeting.';
    case 'meeting': return 'Send a proposal.';
    case 'proposal_sent': return 'Follow up on the proposal.';
    default: return 'No action needed.';
  }
}
