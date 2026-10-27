'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Bookmark, Check, ExternalLink, Loader2, Search } from 'lucide-react';
import { Alert, EmptyState, EvidenceBadge, fmtDate } from '@/components/ui';
import { api, ClientApiError } from '@/components/use-api';
import { CATEGORIES, COUNTRIES } from '@/lib/leads/catalog';
import type { SearchResponse } from '@/lib/leads/service';

interface Initial {
  country: string;
  city: string;
  category: string;
}

type SortKey = 'score' | 'name';

export function LeadSearch({ initial, canSaveSearch, canFilterWebsite, sourceOk, sourceReason }: { initial: Initial; canSaveSearch: boolean; canFilterWebsite: boolean; sourceOk: boolean; sourceReason?: string }) {
  const [f, setF] = useState({ ...initial, websiteStatus: 'any' as 'any' | 'with' | 'without' });
  const [res, setRes] = useState<SearchResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<SortKey>('score');
  const PAGE = 15;

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(null);
    setInfo(null);
    setBusy(true);
    setPage(0);
    try {
      setRes(await api<SearchResponse>('/api/leads/search', 'POST', { ...f, limit: 100 }));
    } catch (x) {
      setRes(null);
      setErr(x instanceof ClientApiError ? x.message : 'Search failed.');
    } finally {
      setBusy(false);
    }
  }

  async function save(source: string, sourceId: string) {
    setSaving((s) => ({ ...s, [sourceId]: 'saving' }));
    setErr(null);
    try {
      const r = await api<{ leadId: string; created: boolean }>('/api/leads', 'POST', { source, sourceId });
      setSaved((s) => ({ ...s, [sourceId]: r.leadId }));
      setSaving((s) => ({ ...s, [sourceId]: 'saved' }));
    } catch (x) {
      setSaving((s) => ({ ...s, [sourceId]: 'error' }));
      setErr(x instanceof ClientApiError ? x.message : 'Could not save the lead.');
    }
  }

  async function saveSearch() {
    const name = window.prompt('Name this search', `${f.category} in ${f.city}`);
    if (!name) return;
    try {
      await api('/api/saved-searches', 'POST', { name, params: { ...f, limit: 100 } });
      setInfo('Search saved.');
    } catch (x) {
      setErr(x instanceof ClientApiError ? x.message : 'Could not save the search.');
    }
  }

  const items = [...(res?.items ?? [])].sort((a, b) => (sort === 'score' ? b.previewScore - a.previewScore : a.candidate.name.localeCompare(b.candidate.name)));
  const pageItems = items.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.max(1, Math.ceil(items.length / PAGE));

  return (
    <div className="space-y-4">
      {!sourceOk && <Alert kind="warn">{sourceReason}</Alert>}
      <form onSubmit={run} className="panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Search for businesses">
        <div>
          <label className="label" htmlFor="country">Country</label>
          <select id="country" className="input" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="city">City or region</label>
          <input id="city" className="input" required minLength={2} maxLength={60} placeholder="Nairobi" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="category">Business category</label>
          <select id="category" className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="web">Website status</label>
          <select id="web" className="input" value={f.websiteStatus} onChange={(e) => setF({ ...f, websiteStatus: e.target.value as typeof f.websiteStatus })}>
            <option value="any">Any</option>
            <option value="with" disabled={!canFilterWebsite}>Listed with a website{canFilterWebsite ? '' : ' (Pro)'}</option>
            <option value="without" disabled={!canFilterWebsite}>No website listed{canFilterWebsite ? '' : ' (Pro)'}</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button className="btn btn-primary flex-1" disabled={busy || !sourceOk}>
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Search size={16} aria-hidden="true" />} Search
          </button>
          {canSaveSearch && (
            <button type="button" className="btn" onClick={saveSearch} disabled={!f.city} aria-label="Save this search" title="Save this search">
              <Bookmark size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <p className="hint sm:col-span-2 lg:col-span-5">Data source: OpenStreetMap. Searching is free. Only saving a business as a lead uses your monthly allowance.</p>
      </form>

      {err && <Alert kind="bad">{err}</Alert>}
      {info && <Alert kind="ok">{info}</Alert>}

      {res && (
        <section className="panel" aria-label="Search results">
          <div className="panel-head">
            <p className="text-sm">
              <span className="font-medium">{res.items.length}</span> result{res.items.length === 1 ? '' : 's'}
              <span className="ml-2 text-xs text-faint">
                retrieved {fmtDate(res.retrievedAt, true)}{res.fromCache ? ' (cached, up to 6 hours old)' : ''}
              </span>
            </p>
            <label className="flex items-center gap-2 text-xs text-muted">
              Sort
              <select className="input h-8 w-auto" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="score">Priority estimate</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>
          {res.items.length === 0 ? (
            <EmptyState icon={Search} title="No matching records">{res.notice}</EmptyState>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="tbl min-w-[56rem]">
                  <thead>
                    <tr>
                      <th scope="col">Business</th>
                      <th scope="col">Website</th>
                      <th scope="col">Public contact</th>
                      <th scope="col">Source and checked</th>
                      <th scope="col" title="Prioritization estimate. Not a probability of conversion.">Priority</th>
                      <th scope="col"><span className="sr-only">Action</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((it) => {
                      const c = it.candidate;
                      const sid = c.provenance.sourceId;
                      const leadId = saved[sid] ?? it.leadId;
                      return (
                        <tr key={`${c.provenance.source}-${sid}`}>
                          <td>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-muted">{c.categoryLabel} · {c.city || 'Location not stated'}</p>
                            <p className="mt-1 max-w-xs text-xs text-faint">{it.signals[0]?.text}</p>
                          </td>
                          <td className="max-w-[12rem] break-words">
                            {c.website ? (
                              <a className="link inline-flex items-center gap-1" href={c.website} target="_blank" rel="noopener noreferrer nofollow">
                                {new URL(c.website).hostname}<ExternalLink size={12} aria-label="opens in a new tab" />
                              </a>
                            ) : (
                              <span className="text-muted">None listed</span>
                            )}
                            <div className="mt-1"><EvidenceBadge level={c.website ? 'reported' : 'inferred'} /></div>
                          </td>
                          <td className="text-xs">
                            {c.phone || c.email ? (
                              <>
                                {c.phone && <p>{c.phone}</p>}
                                {c.email && <p className="break-all">{c.email}</p>}
                                <div className="mt-1"><EvidenceBadge level="reported" /></div>
                              </>
                            ) : (
                              <span className="text-muted">None listed</span>
                            )}
                          </td>
                          <td className="text-xs">
                            <a className="link" href={c.provenance.sourceUrl} target="_blank" rel="noopener noreferrer">{c.provenance.sourceLabel}</a>
                            <p className="text-faint">Retrieved {fmtDate(c.provenance.retrievedAt)}</p>
                            <p className="text-faint">Source last checked: {fmtDate(c.provenance.lastVerifiedAt)}</p>
                            <p className="text-faint">{c.provenance.attribution}</p>
                          </td>
                          <td className="tabular-nums">{it.previewScore}<span className="text-xs text-faint">/100</span></td>
                          <td>
                            {leadId ? (
                              <Link href={`/app/leads/${leadId}`} className="btn btn-sm"><Check size={14} aria-hidden="true" /> Saved</Link>
                            ) : (
                              <button className="btn btn-sm" onClick={() => save(c.provenance.source, sid)} disabled={saving[sid] === 'saving'}>
                                {saving[sid] === 'saving' ? 'Saving' : 'Save lead'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-line px-4 py-2 text-xs text-muted">
                <span>Page {page + 1} of {pages}. Priority is an estimate before any audit; run an audit from a saved lead to add evidence.</span>
                <div className="flex gap-2">
                  <button className="btn btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
                  <button className="btn btn-sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</button>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
