'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Bookmark, Check, ChevronLeft, ChevronRight, ExternalLink, Globe, LayoutGrid, Loader2, MapPin, Search } from 'lucide-react';
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
      <form onSubmit={run} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]" aria-label="Search for businesses">
        <div className="relative">
          <label className="sr-only" htmlFor="city">City or region</label>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
          <input id="city" className="input h-10 pl-9" required minLength={2} maxLength={60} placeholder="City or region, for example Nairobi" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
        </div>
        <div className="relative">
          <label className="sr-only" htmlFor="country">Country</label>
          <MapPin size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
          <select id="country" className="input h-10 pl-9" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
        <div className="relative">
          <label className="sr-only" htmlFor="category">Business category</label>
          <LayoutGrid size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
          <select id="category" className="input h-10 pl-9" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div className="relative">
          <label className="sr-only" htmlFor="web">Website status</label>
          <Globe size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
          <select id="web" className="input h-10 pl-9" value={f.websiteStatus} onChange={(e) => setF({ ...f, websiteStatus: e.target.value as typeof f.websiteStatus })}>
            <option value="any">Any website status</option>
            <option value="with" disabled={!canFilterWebsite}>Listed with a website{canFilterWebsite ? '' : ' (Pro)'}</option>
            <option value="without" disabled={!canFilterWebsite}>No website listed{canFilterWebsite ? '' : ' (Pro)'}</option>
          </select>
        </div>
        <div className="flex gap-2 md:col-span-2 xl:col-span-1">
          <button className="btn btn-primary h-10 flex-1 px-6" disabled={busy || !sourceOk}>
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Search size={16} aria-hidden="true" />} Search
          </button>
          {canSaveSearch && (
            <button type="button" className="btn h-10 w-10 px-0" onClick={saveSearch} disabled={!f.city} aria-label="Save this search" title="Save this search">
              <Bookmark size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <p className="hint md:col-span-2 xl:col-span-5">Data source: OpenStreetMap. Searching is free. Only saving a business as a lead uses your monthly allowance.</p>
      </form>

      {err && <Alert kind="bad">{err}</Alert>}
      {info && <Alert kind="ok">{info}</Alert>}

      {res && (
        <section aria-label="Search results">
          <div className="flex flex-wrap items-center justify-between gap-3 py-1">
            <p className="text-sm">
              <span className="font-semibold">{res.items.length.toLocaleString('en-KE')} lead{res.items.length === 1 ? '' : 's'} found</span>
              <span className="ml-2 text-xs text-faint">
                retrieved {fmtDate(res.retrievedAt, true)}{res.fromCache ? ' (cached, up to 6 hours old)' : ''}
              </span>
            </p>
            <label className="flex items-center gap-2 text-xs text-muted">
              Sort by
              <select className="input h-9 w-auto" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="score">Priority estimate</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>
          {res.items.length === 0 ? (
            <div className="panel mt-2"><EmptyState icon={Search} title="No matching records">{res.notice}</EmptyState></div>
          ) : (
            <div className="panel mt-2 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="tbl min-w-[60rem]">
                  <thead>
                    <tr>
                      <th scope="col" className="uppercase tracking-wide">Business</th>
                      <th scope="col" className="uppercase tracking-wide">Location</th>
                      <th scope="col" className="uppercase tracking-wide">Website</th>
                      <th scope="col" className="uppercase tracking-wide">Public contact</th>
                      <th scope="col" className="uppercase tracking-wide">Source</th>
                      <th scope="col" className="uppercase tracking-wide" title="Prioritization estimate. Not a probability of conversion.">Priority</th>
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
                          <td className="py-3">
                            <div className="flex items-start gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-sm font-bold text-accent-fg" aria-hidden="true">{c.name.trim()[0]?.toUpperCase() ?? '?'}</span>
                              <div className="min-w-0">
                                <p className="font-medium">{c.name}</p>
                                <p className="text-xs text-muted">{c.categoryLabel}</p>
                                {it.signals[0]?.text && <p className="mt-0.5 max-w-xs text-xs text-faint">{it.signals[0].text}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-muted">{c.city || 'Not stated'}</td>
                          <td className="max-w-[12rem] break-words py-3">
                            {c.website ? (
                              <a className="link inline-flex items-center gap-1" href={c.website} target="_blank" rel="noopener noreferrer nofollow">
                                {new URL(c.website).hostname}<ExternalLink size={12} aria-label="opens in a new tab" />
                              </a>
                            ) : (
                              <span className="text-muted">None listed</span>
                            )}
                            <div className="mt-1"><EvidenceBadge level={c.website ? 'reported' : 'inferred'} /></div>
                          </td>
                          <td className="py-3 text-xs">
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
                          <td className="py-3 text-xs">
                            <a className="link" href={c.provenance.sourceUrl} target="_blank" rel="noopener noreferrer">{c.provenance.sourceLabel}</a>
                            <p className="text-faint">Retrieved {fmtDate(c.provenance.retrievedAt)}</p>
                            <p className="text-faint" title={c.provenance.attribution}>Last checked: {fmtDate(c.provenance.lastVerifiedAt)}</p>
                          </td>
                          <td className="py-3"><span className="badge badge-ok tabular-nums">{it.previewScore}<span className="opacity-70">/100</span></span></td>
                          <td className="py-3 text-right">
                            {leadId ? (
                              <Link href={`/app/leads/${leadId}`} className="btn btn-sm"><Check size={14} aria-hidden="true" /> View</Link>
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
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted">
                <span>
                  Showing {page * PAGE + 1}&ndash;{Math.min(items.length, page * PAGE + PAGE)} of {items.length.toLocaleString('en-KE')} results. Priority is an estimate before any audit. Map data &copy; OpenStreetMap contributors.
                </span>
                <nav aria-label="Pagination" className="flex items-center gap-1">
                  <button className="btn btn-sm w-8 px-0" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={14} aria-hidden="true" /></button>
                  {Array.from({ length: pages }, (_, n) => n).filter((n) => n === 0 || n === pages - 1 || Math.abs(n - page) <= 1).map((n, k, arr) => (
                    <span key={n} className="flex items-center gap-1">
                      {k > 0 && n - arr[k - 1] > 1 && <span className="px-1">&hellip;</span>}
                      <button className={`btn btn-sm w-8 px-0 ${n === page ? 'btn-primary' : ''}`} aria-current={n === page ? 'page' : undefined} onClick={() => setPage(n)}>{n + 1}</button>
                    </span>
                  ))}
                  <button className="btn btn-sm w-8 px-0" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={14} aria-hidden="true" /></button>
                </nav>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
