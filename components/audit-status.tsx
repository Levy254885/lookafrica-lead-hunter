'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

/** Polls the audit status while it is pending or running and refreshes the page when it finishes. */
export function AuditStatusPoller({ auditId, status }: { auditId: string; status: 'pending' | 'running' }) {
  const router = useRouter();
  const tries = useRef(0);
  useEffect(() => {
    const t = setInterval(async () => {
      tries.current += 1;
      if (tries.current > 90) return clearInterval(t);
      try {
        const res = await fetch(`/api/audits/${auditId}`);
        if (!res.ok) return;
        const j = (await res.json()) as { status: string };
        if (j.status === 'completed' || j.status === 'failed') {
          clearInterval(t);
          router.refresh();
        }
      } catch {
        // keep polling
      }
    }, 3000);
    return () => clearInterval(t);
  }, [auditId, router]);
  return (
    <div role="status" className="flex items-center gap-2 text-sm text-muted">
      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      {status === 'pending' ? 'Audit queued. It starts in a moment.' : 'Audit running. Checks and PageSpeed can take up to a minute.'}
    </div>
  );
}
