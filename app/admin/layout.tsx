import Link from 'next/link';
import { Logo } from '@/components/brand';
import { requireAdminPage } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="container-page flex h-12 items-center justify-between">
          <Logo href="/admin" />
          <Link className="btn btn-ghost btn-sm" href="/app">Back to app</Link>
        </div>
      </header>
      <main className="container-page py-8">{children}</main>
    </div>
  );
}
