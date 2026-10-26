'use client';
import { useState } from 'react';
import { Alert } from '@/components/ui';
import { api, ClientApiError } from '@/components/use-api';

export function SuppressionForm() {
  const [type, setType] = useState<'email' | 'domain'>('email');
  const [value, setValue] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/api/suppressions', 'POST', { type, value });
      setMsg({ kind: 'ok', text: 'Added to your opt-out list. New drafts to this recipient will be flagged.' });
      setValue('');
    } catch (x) {
      setMsg({ kind: 'bad', text: x instanceof ClientApiError ? x.message : 'Could not add.' });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 p-4" aria-label="Add to opt-out list">
      <div className="flex flex-wrap gap-2">
        <select className="input w-auto" aria-label="Type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="email">Email address</option>
          <option value="domain">Whole domain</option>
        </select>
        <input className="input min-w-[14rem] flex-1" aria-label="Value" placeholder={type === 'email' ? 'name@example.com' : 'example.com'} value={value} onChange={(e) => setValue(e.target.value)} required />
        <button className="btn" disabled={!value}>Add</button>
      </div>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
    </form>
  );
}
