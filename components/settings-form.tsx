'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/ui';
import { api, ClientApiError } from '@/components/use-api';
import { COUNTRIES } from '@/lib/leads/catalog';
import { SERVICES } from '@/lib/types';

export function SettingsForm({ initial }: { initial: { displayName: string; country: string; services: string[] } }) {
  const router = useRouter();
  const [name, setName] = useState(initial.displayName);
  const [country, setCountry] = useState(initial.country);
  const [services, setServices] = useState<string[]>(initial.services);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/api/profile', 'PATCH', { displayName: name, country, services });
      setMsg({ kind: 'ok', text: 'Saved.' });
      router.refresh();
    } catch (x) {
      setMsg({ kind: 'bad', text: x instanceof ClientApiError ? x.message : 'Could not save.' });
    }
  }

  return (
    <form onSubmit={save} className="space-y-4 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="dn">Name</label><input id="dn" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required /></div>
        <div><label className="label" htmlFor="ct">Home country</label><select id="ct" className="input" value={country} onChange={(e) => setCountry(e.target.value)}>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</select></div>
      </div>
      <fieldset>
        <legend className="label">Services you offer</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {SERVICES.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={services.includes(s.id)} onChange={(e) => setServices(e.target.checked ? [...services, s.id] : services.filter((x) => x !== s.id))} />
              {s.label}
            </label>
          ))}
        </div>
        <p className="hint">Used in lead scoring to measure how well audit findings fit what you sell.</p>
      </fieldset>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <button className="btn btn-primary">Save settings</button>
    </form>
  );
}

export function DeleteAccount() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  async function del() {
    try {
      await api('/api/account/delete', 'POST', { confirm: 'DELETE' });
      router.replace('/');
    } catch (x) {
      setErr(x instanceof ClientApiError ? x.message : 'Could not delete the account.');
    }
  }
  return (
    <div className="space-y-3 p-4 text-sm">
      <p className="text-muted">Deleting your account permanently removes your leads, notes, audits, drafts, saved searches, opt-out list and activity. Payment records are kept in anonymised form. This cannot be undone. Cancel any active card subscription on Pesapal separately.</p>
      <label className="label" htmlFor="del">Type DELETE to confirm</label>
      <div className="flex gap-2">
        <input id="del" className="input max-w-[12rem]" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
        <button className="btn btn-danger" disabled={text !== 'DELETE'} onClick={del}>Delete account</button>
      </div>
      {err && <Alert kind="bad">{err}</Alert>}
    </div>
  );
}
