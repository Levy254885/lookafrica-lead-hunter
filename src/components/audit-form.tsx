'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Gauge, Loader2 } from 'lucide-react';
import { Alert } from '@/components/ui';
import { api, ClientApiError } from '@/components/use-api';

export function AuditForm() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ auditId: string }>('/api/audits', 'POST', { url });
      router.push(`/app/audits/${r.auditId}`);
    } catch (x) {
      setErr(x instanceof ClientApiError ? x.message : 'Could not start the audit.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel p-4" aria-label="Audit a website">
      <label htmlFor="aurl" className="label">Public website address</label>
      <div className="flex flex-wrap gap-2">
        <input id="aurl" className="input min-w-[16rem] flex-1" placeholder="example.co.ke" value={url} onChange={(e) => setUrl(e.target.value)} required maxLength={2048} inputMode="url" />
        <button className="btn btn-primary" disabled={busy || !url}>
          {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Gauge size={16} aria-hidden="true" />} Run audit
        </button>
      </div>
      <p className="hint">Only public http and https addresses are accepted. Uses one audit from your allowance unless the same address was audited in the last 24 hours.</p>
      {err && <div className="mt-3"><Alert kind="bad">{err}</Alert></div>}
    </form>
  );
}
