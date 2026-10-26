import Link from 'next/link';
import { Mail } from 'lucide-react';
import { SuppressionForm } from '@/components/suppression-form';
import { Alert, EmptyState, fmtDate, PageHeader } from '@/components/ui';
import { requireUserPage } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { toPlain } from '@/lib/serialize';

export const metadata = { title: 'Outreach' };

export default async function Outreach() {
  const user = await requireUserPage();
  const snap = await adminDb().collection('outreach').where('ownerId', '==', user.uid).orderBy('createdAt', 'desc').limit(50).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...toPlain<{ leadId: string; leadName: string; subject: string; status: string; generator: string; createdAt: string; suppressed: boolean }>(d.data()) }));
  return (
    <>
      <PageHeader title="Outreach" description="Drafts you have created. You review and send them yourself; nothing is sent automatically." />
      <div className="mb-6"><Alert kind="info">Automated sending is not enabled. When you send a message, follow the law that applies to the recipient (including data protection and electronic marketing rules), identify yourself, and stop contacting anyone who asks.</Alert></div>
      <section className="panel" aria-label="Drafts">
        <div className="panel-head"><h2 className="panel-title">Drafts</h2></div>
        {rows.length === 0 ? (
          <EmptyState icon={Mail} title="No drafts yet">Open a saved lead and choose Create draft. Drafts use only the evidence on file.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[40rem]">
              <thead><tr><th scope="col">Lead</th><th scope="col">Subject</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col">Created</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><Link className="link" href={`/app/leads/${r.leadId}`}>{r.leadName}</Link></td>
                    <td>{r.subject}</td>
                    <td><span className="badge">{r.generator === 'ai' ? 'AI' : 'Template'}</span></td>
                    <td>{r.suppressed ? <span className="badge badge-bad">Opted out</span> : <span className="badge">{r.status.replace('_', ' ')}</span>}</td>
                    <td className="text-xs text-muted">{fmtDate(r.createdAt, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="panel mt-6" aria-labelledby="opt">
        <div className="panel-head"><h2 id="opt" className="panel-title">Opt-out list</h2></div>
        <p className="px-4 pt-3 text-sm text-muted">Add people or domains who asked not to be contacted. Drafts for them are flagged and cannot be marked as sent.</p>
        <SuppressionForm />
      </section>
    </>
  );
}
