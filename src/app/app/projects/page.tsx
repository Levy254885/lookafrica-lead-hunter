import { ExternalLink, Telescope } from 'lucide-react';
import { Alert, EmptyState, fmtDate, PageHeader } from '@/components/ui';
import { requireUserPage } from '@/lib/auth/session';
import { getProjectSourceState, listProjects, refreshProjects } from '@/lib/projects/service';
import { remotiveStatus } from '@/lib/projects/remotive';

export const metadata = { title: 'Project Opportunities' };
export const dynamic = 'force-dynamic';

export default async function Projects() {
  await requireUserPage();
  const status = remotiveStatus();
  let notice: { kind: 'warn' | 'info'; text: string } | null = null;
  let rows: Awaited<ReturnType<typeof listProjects>> = [];
  let state: Awaited<ReturnType<typeof getProjectSourceState>> = { lastSuccessAt: null, lastError: null };

  if (!status.available) {
    notice = { kind: 'warn', text: status.reason ?? 'No project source is enabled.' };
  } else {
    // Refresh is rate-limited by a lock, so visiting the page cannot hammer the provider.
    const outcome = await refreshProjects();
    if (outcome.state === 'failed') notice = { kind: 'warn', text: outcome.message };
    state = await getProjectSourceState();
    rows = await listProjects({ limit: 60 });
  }

  return (
    <>
      <PageHeader title="Project Opportunities" description="Public project and contract listings, kept separate from your leads. Each links to the original listing." />
      {notice && <div className="mb-4"><Alert kind={notice.kind}>{notice.text}</Alert></div>}
      {status.available && (
        <p className="mb-3 text-xs text-muted">
          Source: Remotive remote jobs (software development). Last successful check: {fmtDate(state.lastSuccessAt, true)}. These are remote job and contract listings from a third-party board, not local businesses. A listing shown here was present at the last check; open the original to confirm it is still open.
        </p>
      )}
      <section className="panel" aria-label="Project listings">
        {rows.length === 0 ? (
          <EmptyState icon={Telescope} title={status.available ? 'No listings yet' : 'No project source enabled'}>
            {status.available ? 'Listings appear after the first successful check of the source.' : 'An operator needs to enable a project source. Setup steps are in docs/DATA_SOURCES.md.'}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[56rem]">
              <thead><tr><th scope="col">Title</th><th scope="col">Organization</th><th scope="col">Location</th><th scope="col">Skills</th><th scope="col">Published</th><th scope="col">Checked</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <a className="link inline-flex items-center gap-1" href={r.url} target="_blank" rel="noopener noreferrer nofollow">{r.title}<ExternalLink size={12} aria-label="opens in a new tab" /></a>
                      <p className="text-xs text-faint">{r.category} · via Remotive</p>
                    </td>
                    <td className="text-sm">{r.organization ?? 'Not stated'}<p className="text-xs text-faint">As reported, not verified</p></td>
                    <td className="text-xs">{r.remote ? 'Remote' : ''}{r.location ? ` · ${r.location}` : ''}</td>
                    <td className="max-w-[14rem] text-xs text-muted">{r.skills.length ? r.skills.join(', ') : 'Not stated'}</td>
                    <td className="text-xs">{fmtDate(r.publishedAt)}<p className="text-faint">Deadline: not provided</p></td>
                    <td className="text-xs text-muted">{fmtDate(r.lastCheckedAt, true)}</td>
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
