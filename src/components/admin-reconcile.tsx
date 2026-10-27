'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ClientApiError } from '@/components/use-api';

export function AdminReconcile({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <button
        className="btn btn-sm"
        onClick={async () => {
          try {
            const r = await api<{ outcome: string }>('/api/admin/reconcile', 'POST', { paymentId });
            setMsg(r.outcome);
            router.refresh();
          } catch (e) {
            setMsg(e instanceof ClientApiError ? e.message : 'Failed');
          }
        }}
      >
        Re-check
      </button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </div>
  );
}
