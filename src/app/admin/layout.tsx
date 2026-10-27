import Link from 'next/link';
import { Logo } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';
import { requireAdminPage } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="container-page flex h-12 items-center justify-between">
          <Logo href="/admin" />
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Link className="btn btn-ghost btn-sm" href="/app">Back to app</Link>
          </div>
        </div>
      </header>
      <main className="container-page py-4">{children}</main>
    </div>
  );
}
