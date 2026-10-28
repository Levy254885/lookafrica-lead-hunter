'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Archive, ArchiveRestore, Copy, Gauge, Loader2, Mail } from 'lucide-react';
import { Alert, fmtDate } from '@/components/ui';
import { api, ClientApiError } from '@/components/use-api';
import { SERVICES, type PipelineStatus } from '@/lib/types';

interface Props {
  leadId: string;
  website: string | null;
  initial: { status: string; notes: string; tags: string[]; followUpAt: string | null; archived: boolean; outcome: { result: string; reason?: string } | null };
  statuses: PipelineStatus[];
  latestAuditId: string | null;
  userServices: string[];
  suggestedServices: string[];
  drafts: { id: string; subject: string; body: string; status: string; generator: string; createdAt: string; suppressed: boolean }[];
}

export function LeadWorkspace(p: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(p.initial.status);
  const [notes, setNotes] = useState(p.initial.notes);
  const [tags, setTags] = useState(p.initial.tags.join(', '));
  const [follow, setFollow] = useState(p.initial.followUpAt ? p.initial.followUpAt.slice(0, 10) : '');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [service, setService] = useState(p.suggestedServices[0] ?? p.userServices[0] ?? 'web_build');
  const [tone, setTone] = useState<'professional' | 'friendly' | 'brief'>('professional');
  const [auditUrl, setAuditUrl] = useState(p.website ?? '');

  async function call<T>(key: string, fn: () => Promise<T>, ok?: string): Promise<T | null> {
    setBusy(key);
    setMsg(null);
    try {
      const r = await fn();
      if (ok) setMsg({ kind: 'ok', text: ok });
      router.refresh();
      return r;
    } catch (e) {
      setMsg({ kind: 'bad', text: e instanceof ClientApiError ? e.message : 'Something went wrong.' });
      return null;
    } finally {
      setBusy(null);
    }
  }

  const save = () =>
    call('save', () =>
      api(`/api/leads/${p.leadId}`, 'PATCH', {
        status,
        notes,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 15),
        followUpAt: follow ? new Date(`${follow}T09:00:00+03:00`).toISOString() : null,
        ...(['won', 'lost', 'not_a_fit'].includes(status) ? { outcome: { result: status } } : {}),
      }),
    'Saved.');

  const audit = () =>
    call('audit', async () => {
      const r = await api<{ auditId: string; reused: boolean }>('/api/audits', 'POST', { url: auditUrl, leadId: p.leadId });
      setMsg({ kind: 'info', text: r.reused ? 'An existing audit for this address was reused at no charge.' : 'Audit started. It will appear below when finished.' });
      router.push(`/app/audits/${r.auditId}`);
    });

  const draft = () =>
    call('draft', async () => {
      const r = await api<{ notice: string | null; suppressed: boolean }>('/api/drafts', 'POST', { leadId: p.leadId, service, tone, channel: 'email' });
      setMsg({ kind: r.suppressed ? 'bad' : 'ok', text: r.suppressed ? 'Draft created, but this recipient is on your opt-out list.' : r.notice ?? 'Draft created.' });
    });

  return (
    <div className="space-y-6">
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

      <section className="panel" aria-labelledby="pipe">
        <div className="panel-head">
          <h2 id="pipe" className="panel-title">Pipeline and notes</h2>
          <button className="btn btn-sm" onClick={() => call('arch', () => api(`/api/leads/${p.leadId}`, 'PATCH', { archived: !p.initial.archived }), p.initial.archived ? 'Restored.' : 'Archived.')}>
            {p.initial.archived ? <ArchiveRestore size={14} aria-hidden="true" /> : <Archive size={14} aria-hidden="true" />}
            {p.initial.archived ? 'Restore' : 'Archive'}
          </button>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="st">Status</label>
            <select id="st" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {p.statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="fu">Follow-up date</label>
            <input id="fu" type="date" className="input" value={follow} onChange={(e) => setFollow(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="tg">Tags (comma separated)</label>
            <input id="tg" className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div className="sm:col-span-3">
            <label className="label" htmlFor="nt">Private notes</label>
            <textarea id="nt" className="input" rows={4} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <p className="hint">Only you can see notes. {p.initial.outcome ? `Outcome recorded: ${p.initial.outcome.result}.` : ''}</p>
          </div>
          <div className="sm:col-span-3">
            <button className="btn btn-primary" onClick={save} disabled={busy === 'save'}>
              {busy === 'save' && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Save changes
            </button>
          </div>
        </div>
      </section>

      <section className="panel" aria-labelledby="aud">
        <div className="panel-head"><h2 id="aud" className="panel-title">Run a website audit</h2></div>
        <div className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[16rem] flex-1">
            <label className="label" htmlFor="au">Website address</label>
            <input id="au" className="input" placeholder="example.co.ke" value={auditUrl} onChange={(e) => setAuditUrl(e.target.value)} />
            {!p.website && <p className="hint">No website is listed for this business. Enter an address you found yourself, or skip this step.</p>}
          </div>
          <button className="btn" onClick={audit} disabled={!auditUrl || busy === 'audit'}>
            {busy === 'audit' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Gauge size={16} aria-hidden="true" />} Audit
          </button>
        </div>
        <p className="border-t border-line px-4 py-2 text-xs text-faint">Uses one audit from your allowance unless the same address was audited in the last 24 hours.</p>
      </section>

      <section className="panel" aria-labelledby="prop">
        <div className="panel-head"><h2 id="prop" className="panel-title">Proposal drafts</h2></div>
        <div className="grid gap-3 p-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="sv">Service to offer</label>
            <select id="sv" className="input" value={service} onChange={(e) => setService(e.target.value)}>
              {SERVICES.map((s) => <option key={s.id} value={s.id}>{s.label}{p.suggestedServices.includes(s.id) ? ' (matches audit)' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tn">Tone</label>
            <select id="tn" className="input" value={tone} onChange={(e) => setTone(e.target.value as typeof tone)}>
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="brief">Brief</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" onClick={draft} disabled={busy === 'draft'}>
              {busy === 'draft' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Mail size={16} aria-hidden="true" />} Create draft
            </button>
          </div>
        </div>
        <p className="border-t border-line px-4 py-2 text-xs text-faint">
          Drafts use only facts on file. If AI drafting is configured it uses one AI draft from your allowance; otherwise a free template draft is made.
        </p>
        {p.drafts.length > 0 && (
          <ul className="divide-y divide-line border-t border-line">
            {p.drafts.map((d) => <DraftItem key={d.id} d={d} onChange={() => router.refresh()} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

function DraftItem({ d, onChange }: { d: Props['drafts'][number]; onChange: () => void }) {
  const [subject, setSubject] = useState(d.subject);
  const [body, setBody] = useState(d.body);
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function patch(data: Record<string, unknown>, ok: string) {
    try {
      await api(`/api/drafts/${d.id}`, 'PATCH', data);
      setMsg(ok);
      onChange();
    } catch (e) {
      setMsg(e instanceof ClientApiError ? e.message : 'Could not update the draft.');
    }
  }

  return (
    <li className="p-4">
      <button className="flex w-full items-center justify-between gap-2 text-left text-sm" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="font-medium">{d.subject}</span>
        <span className="flex gap-1.5">
          <span className="badge">{d.generator === 'ai' ? 'AI' : 'Template'}</span>
          <span className="badge">{d.status.replace('_', ' ')}</span>
        </span>
      </button>
      <p className="mt-0.5 text-xs text-faint">{fmtDate(d.createdAt, true)}</p>
      {open && (
        <div className="mt-3 space-y-3">
          {d.suppressed && <Alert kind="bad">This recipient is on your opt-out list. Do not contact them.</Alert>}
          <input className="input" aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} />
          <textarea className="input font-mono text-xs" aria-label="Body" rows={12} value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} />
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-sm" onClick={() => patch({ subject, body }, 'Draft saved.')}>Save edits</button>
            <button className="btn btn-sm" onClick={async () => { await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); setMsg('Copied to clipboard.'); }}>
              <Copy size={14} aria-hidden="true" /> Copy
            </button>
            <button className="btn btn-sm" disabled={d.suppressed} onClick={() => patch({ status: 'sent_manually', moveLeadToContacted: true }, 'Marked as sent and lead moved to Contacted.')}>
              I sent this myself
            </button>
          </div>
          {msg && <p className="text-xs text-muted" role="status">{msg}</p>}
        </div>
      )}
    </li>
  );
}
