import { AppNav } from '@/components/app-nav';
import { AppTopbar } from '@/components/app-topbar';
import { VerifyBanner } from '@/components/verify-banner';
import { requireUserPage } from '@/lib/auth/session';
import { getEntitlements } from '@/lib/entitlements';
import { getProfile } from '@/lib/users';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage();
  const [ent, profile] = await Promise.all([getEntitlements(user), getProfile(user.uid)]);
  return (
    <div className="min-h-screen">
      <AppNav isAdmin={user.isAdmin} plan={{ name: ent.plan.name, leadsUsed: ent.used.leads, leadsQuota: ent.quotas.leads }} />
      <div className="lg:pl-64">
        <AppTopbar name={profile.displayName} email={user.email} />
        <main id="main" className="mx-auto max-w-[78rem] px-4 py-6 sm:px-8">
          {!user.emailVerified && <VerifyBanner email={user.email} />}
          {children}
        </main>
      </div>
    </div>
  );
}
