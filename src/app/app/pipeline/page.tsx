import Link from 'next/link';
import { KanbanSquare } from 'lucide-react';
import { PipelineView } from '@/components/pipeline-board';
import { EmptyState, PageHeader } from '@/components/ui';
import { requireUserPage } from '@/lib/auth/session';
import { getEntitlements } from '@/lib/entitlements';
import { listLeads } from '@/lib/leads/service';
import { getProfile } from '@/lib/users';

export const metadata = { title: 'My Pipeline' };

export default async function Pipeline({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUserPage();
  const sp = await searchParams;
  const [leads, profile, ent] = await Promise.all([listLeads(user.uid, { limit: 500 }), getProfile(user.uid), getEntitlements(user)]);
  return (
    <>
      <PageHeader title="Pipeline" description="Your saved leads, private to you. Move them through your stages and keep follow-ups on track." />
      {leads.length === 0 ? (
        <div className="panel">
          <EmptyState icon={KanbanSquare} title="No saved leads yet" action={<Link className="btn btn-primary" href="/app/leads">Find leads</Link>}>
            Save a business from the search results and it appears here.
          </EmptyState>
        </div>
      ) : (
        <PipelineView leads={leads} statuses={profile.pipelineStatuses} canExport={ent.plan.features.csvExport} initialQuery={(sp.q ?? '').slice(0, 80)} />
      )}
    </>
  );
}
