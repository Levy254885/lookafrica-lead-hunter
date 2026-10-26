import Link from 'next/link';
import { Gauge } from 'lucide-react';
import { AuditForm } from '@/components/audit-form';
import { EmptyState, fmtDate, PageHeader } from '@/components/ui';
import { requireUserPage } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { toPlain } from '@/lib/serialize';

export const metadata = { title: 'Website Audits' };

const BADGE: Record<string, string> = { completed: 'badge-ok', failed: 'badge-bad', running: 'badge-info', pending: '' };

export default async function Audits() {
  const user = await requireUserPage();
  const snap = await adminDb().collection('audits').where('ownerId', '==', user.uid).orderBy('createdAt', 'desc').limit(50).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...toPlain<{ host: string; status: string; createdAt: string; summary: { fail: number; warn: number; pass: number } | null }>(d.data()) }));
  return (
    <>
      <PageHeader title="Website Audits" description="Measured checks of a public website, each with its evidence. Audits are separate from your saved leads." />
      <AuditForm />
      <section className="panel mt-6" aria-label="Past audits">
        <div className="panel-head"><h2 className="panel-title">Your audits</h2></div>
        {rows.length === 0 ? (
          <EmptyState icon={Gauge} title="No audits yet">Enter a website address above to run your first audit.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[36rem]">
              <thead><tr><th scope="col">Website</th><th scope="col">Status</th><th scope="col">Findings</th><th scope="col">Requested</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><Link className="link" href={`/app/audits/${r.id}`}>{r.host}</Link></td>
                    <td><span className={`badge ${BADGE[r.status] ?? ''}`}>{r.status}</span></td>
                    <td className="text-xs text-muted">{r.summary ? `${r.summary.fail} fail, ${r.summary.warn} warning, ${r.summary.pass} pass` : 'Not available'}</td>
                    <td className="text-xs text-muted">{fmtDate(r.createdAt, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
