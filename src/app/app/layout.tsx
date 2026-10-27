import { AppNav } from '@/components/app-nav';
import { VerifyBanner } from '@/components/verify-banner';
import { requireUserPage } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage();
  return (
    <div className="min-h-screen">
      <AppNav isAdmin={user.isAdmin} email={user.email} />
      <div className="lg:pl-56">
        <main id="main" className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:py-5">
          {!user.emailVerified && <VerifyBanner email={user.email} />}
          {children}
        </main>
      </div>
    </div>
  );
}
